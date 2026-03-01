package com.ecommerce.order.listener;

import com.ecommerce.order.domain.CustomerOrder;
import com.ecommerce.order.domain.OrderStatus;
import com.ecommerce.order.domain.OutboxEvent;
import com.ecommerce.order.repository.CustomerOrderRepository;
import com.ecommerce.order.repository.OutboxEventRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.transaction.Transactional;
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
        String orderId       = payload.getOrDefault("orderId", "").toString();
        String paymentStatus = payload.getOrDefault("status",  "").toString();

        if (orderId.isBlank() || paymentStatus.isBlank()) return;

        CustomerOrder order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            log.warn("Payment result received for unknown order {}", orderId);
            return;
        }

        OrderStatus newStatus = switch (paymentStatus.toUpperCase()) {
            case "APPROVED" -> OrderStatus.PAID;
            case "DECLINED" -> OrderStatus.CANCELLED;
            default -> null; // PENDING or unknown — payment service will retry
        };
        if (newStatus == null) return;

        order.setStatus(newStatus);
        orderRepository.save(order);

        // Notify user of the final order status via outbox → notification-service
        try {
            String outboxPayload = objectMapper.writeValueAsString(Map.of(
                "orderId",     order.getId(),
                "userId",      order.getUserId(),
                "status",      order.getStatus().name(),
                "paymentState", paymentStatus,
                "totalAmount", order.getTotalAmount().toString(),
                "createdAt",   order.getCreatedAt().toString()));
            outboxRepository.save(new OutboxEvent(orderExchange, orderRoutingKey, outboxPayload));
        } catch (JsonProcessingException e) {
            log.error("Failed to enqueue order notification for order {}", orderId, e);
        }
    }
}
