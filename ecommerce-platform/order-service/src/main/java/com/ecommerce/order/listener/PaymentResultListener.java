package com.ecommerce.order.listener;

import com.ecommerce.order.domain.CustomerOrder;
import com.ecommerce.order.domain.OrderItem;
import com.ecommerce.order.domain.OrderStatus;
import com.ecommerce.order.domain.OutboxEvent;
import com.ecommerce.order.repository.CustomerOrderRepository;
import com.ecommerce.order.repository.OutboxEventRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class PaymentResultListener {

    private static final Logger log = LoggerFactory.getLogger(PaymentResultListener.class);

    private final CustomerOrderRepository orderRepository;
    private final OutboxEventRepository outboxRepository;
    private final ObjectMapper objectMapper;
    private final String orderExchange;
    private final String orderRoutingKey;

    public PaymentResultListener(CustomerOrderRepository orderRepository,
                                 OutboxEventRepository outboxRepository,
                                 ObjectMapper objectMapper,
                                 @Value("${messaging.exchange.commerce:commerce.events}") String orderExchange,
                                 @Value("${messaging.routing.order-created:order.created}") String orderRoutingKey) {
        this.orderRepository = orderRepository;
        this.outboxRepository = outboxRepository;
        this.objectMapper = objectMapper;
        this.orderExchange = orderExchange;
        this.orderRoutingKey = orderRoutingKey;
    }

    @RabbitListener(queues = "order.payment.results")
    @Transactional
    public void onPaymentResult(Map<String, Object> payload) {
        String orderId = payload.getOrDefault("orderId", "").toString();
        String paymentStatus = payload.getOrDefault("status", "").toString();

        if (orderId.isBlank() || paymentStatus.isBlank()) {
            return;
        }

        CustomerOrder order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            log.warn("Payment result received for unknown order {}", orderId);
            return;
        }

        OrderStatus newStatus = switch (paymentStatus.toUpperCase()) {
            case "APPROVED" -> OrderStatus.PAID;
            case "DECLINED" -> OrderStatus.CANCELLED;
            default -> null;
        };
        if (newStatus == null) {
            return;
        }

        if (order.getStatus() == newStatus) {
            log.info("Order {} already marked {}. Skipping duplicate payment-result update.", orderId, newStatus);
            return;
        }

        order.setStatus(newStatus);
        orderRepository.save(order);

        try {
            List<Map<String, Object>> items = order.getItems().stream()
                .map(this::toItemPayload)
                .toList();
            Map<String, Object> eventPayload = new LinkedHashMap<>();
            eventPayload.put("orderId", order.getId());
            eventPayload.put("userId", order.getUserId());
            eventPayload.put("recipientEmail", resolveRecipientEmail(order));
            eventPayload.put("status", order.getStatus().name());
            eventPayload.put("paymentState", paymentStatus);
            eventPayload.put("totalAmount", order.getTotalAmount().toString());
            eventPayload.put("createdAt", order.getCreatedAt().toString());
            eventPayload.put("guestCheckout", order.isGuestCheckout());
            eventPayload.put("customerEmail", order.getCustomerEmail());
            eventPayload.put("customerFirstName", order.getCustomerFirstName());
            eventPayload.put("customerLastName", order.getCustomerLastName());
            eventPayload.put("shippingStreetAddress", order.getShippingStreetAddress());
            eventPayload.put("shippingCity", order.getShippingCity());
            eventPayload.put("shippingState", order.getShippingState());
            eventPayload.put("shippingPostalCode", order.getShippingPostalCode());
            eventPayload.put("shippingCountry", order.getShippingCountry());
            eventPayload.put("items", items);
            String outboxPayload = objectMapper.writeValueAsString(eventPayload);
            outboxRepository.save(new OutboxEvent(orderExchange, orderRoutingKey, outboxPayload));
        } catch (JsonProcessingException e) {
            log.error("Failed to enqueue order notification for order {}", orderId, e);
        }
    }

    private Map<String, Object> toItemPayload(OrderItem item) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("productId", item.getProductId());
        payload.put("productName", item.getProductName());
        payload.put("quantity", item.getQuantity());
        payload.put("unitPrice", item.getUnitPrice().toString());
        payload.put("lineTotal", item.getUnitPrice()
            .multiply(BigDecimal.valueOf(item.getQuantity()))
            .toString());
        return payload;
    }

    private String resolveRecipientEmail(CustomerOrder order) {
        String email = order.getCustomerEmail();
        if (email != null && !email.isBlank()) {
            return email;
        }
        return order.getUserId();
    }
}
