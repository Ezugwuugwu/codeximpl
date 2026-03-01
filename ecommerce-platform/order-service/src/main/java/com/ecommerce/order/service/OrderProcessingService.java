package com.ecommerce.order.service;

import com.ecommerce.order.domain.CustomerOrder;
import com.ecommerce.order.domain.OrderItem;
import com.ecommerce.order.domain.OrderStatus;
import com.ecommerce.order.domain.OutboxEvent;
import com.ecommerce.order.repository.CustomerOrderRepository;
import com.ecommerce.order.repository.OutboxEventRepository;
import com.ecommerce.order.service.dto.CreateOrderRequest;
import com.ecommerce.order.service.dto.OrderItemRequest;
import com.ecommerce.order.service.dto.PaymentRequest;
import com.ecommerce.order.service.dto.PaymentResponse;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@Service
public class OrderProcessingService {

    private static final Logger log = LoggerFactory.getLogger(OrderProcessingService.class);

    private final CustomerOrderRepository repository;
    private final OutboxEventRepository outboxRepository;
    private final ObjectMapper objectMapper;
    private final RestClient paymentClient;
    private final String orderExchange;
    private final String orderRoutingKey;

    public OrderProcessingService(CustomerOrderRepository repository,
                                  OutboxEventRepository outboxRepository,
                                  ObjectMapper objectMapper,
                                  RestClient paymentRestClient,
                                  @Value("${messaging.exchange.commerce:commerce.events}") String orderExchange,
                                  @Value("${messaging.routing.order-created:order.created}") String orderRoutingKey) {
        this.repository = repository;
        this.outboxRepository = outboxRepository;
        this.objectMapper = objectMapper;
        this.paymentClient = paymentRestClient;
        this.orderExchange = orderExchange;
        this.orderRoutingKey = orderRoutingKey;
    }

    @Transactional
    public CustomerOrder createOrder(String userId, CreateOrderRequest request) {
        CustomerOrder order = new CustomerOrder();
        order.setUserId(userId);
        order.setStatus(OrderStatus.PAYMENT_PENDING);

        BigDecimal total = BigDecimal.ZERO;
        for (OrderItemRequest itemRequest : request.items()) {
            OrderItem item = new OrderItem();
            item.setProductId(itemRequest.productId());
            item.setProductName(itemRequest.productName());
            item.setQuantity(itemRequest.quantity());
            item.setUnitPrice(itemRequest.unitPrice());
            total = total.add(itemRequest.unitPrice().multiply(BigDecimal.valueOf(itemRequest.quantity())));
            order.addItem(item);
        }

        order.setTotalAmount(total);
        CustomerOrder saved = repository.save(order);

        // Notify user the order was placed (status: PAYMENT_PENDING)
        saveToOutbox(saved, "PENDING");

        String resolvedMethod = resolvePaymentMethod(request.paymentIntentId());

        if (isPaystackMethod(resolvedMethod)) {
            // Paystack: payment is already completed in the browser popup before the order is
            // created. Verify synchronously so the order status is set to PAID immediately
            // instead of waiting for the async RabbitMQ chain.
            verifyPaystackPaymentSync(saved, resolvedMethod);
        } else {
            // All other payment methods: enqueue via the outbox for async processing.
            enqueuePaymentRequest(saved, resolvedMethod);
        }

        return saved;
    }

    public CustomerOrder getById(String orderId) {
        return repository.findById(orderId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
    }

    public List<CustomerOrder> getByUser(String userId) {
        return repository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public Page<CustomerOrder> listAllOrders(Pageable pageable) {
        return repository.findAllByOrderByCreatedAtDesc(pageable);
    }

    @Transactional
    public CustomerOrder updateStatus(String orderId, OrderStatus status) {
        CustomerOrder order = getById(orderId);
        order.setStatus(status);
        CustomerOrder saved = repository.save(order);
        saveToOutbox(saved, status.name());
        return saved;
    }

    private void verifyPaystackPaymentSync(CustomerOrder order, String method) {
        try {
            PaymentResponse response = paymentClient
                .post()
                .uri("/api/payments/process")
                .contentType(MediaType.APPLICATION_JSON)
                .body(new PaymentRequest(order.getId(), order.getUserId(), order.getTotalAmount(), "NGN", method))
                .retrieve()
                .body(PaymentResponse.class);

            if (response != null && "APPROVED".equalsIgnoreCase(response.status())) {
                order.setStatus(OrderStatus.PAID);
                repository.save(order);
                log.info("Paystack payment verified for order {}", order.getId());
            } else {
                String status = response != null ? response.status() : "null";
                log.warn("Paystack payment not approved for order {}: status={}", order.getId(), status);
            }
        } catch (Exception e) {
            // Payment-service unreachable — leave order as PAYMENT_PENDING and fall back to
            // the async outbox path so the payment is retried when the service recovers.
            log.warn("Synchronous Paystack verification failed for order {}, falling back to async: {}",
                order.getId(), e.getMessage());
            enqueuePaymentRequest(order, method);
        }
    }

    private void enqueuePaymentRequest(CustomerOrder order, String method) {
        try {
            String payload = objectMapper.writeValueAsString(Map.of(
                "orderId",  order.getId(),
                "userId",   order.getUserId(),
                "amount",   order.getTotalAmount().toString(),
                "currency", "NGN",
                "method",   method));
            outboxRepository.save(new OutboxEvent(orderExchange, "payment.requested", payload));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize payment request", e);
        }
    }

    private void saveToOutbox(CustomerOrder order, String paymentState) {
        try {
            String payload = objectMapper.writeValueAsString(Map.of(
                "orderId",      order.getId(),
                "userId",       order.getUserId(),
                "status",       order.getStatus().name(),
                "paymentState", paymentState,
                "totalAmount",  order.getTotalAmount().toString(),
                "createdAt",    order.getCreatedAt().toString()));
            outboxRepository.save(new OutboxEvent(orderExchange, orderRoutingKey, payload));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize order event", e);
        }
    }

    private String resolvePaymentMethod(String paymentIntentId) {
        if (paymentIntentId == null || paymentIntentId.isBlank()) {
            return "CARD";
        }
        String trimmed = paymentIntentId.trim();
        // Pass Paystack references through as-is (already prefixed by the frontend)
        if (trimmed.startsWith("PAYSTACK:")) {
            return trimmed;
        }
        return "STRIPE:" + trimmed;
    }

    private boolean isPaystackMethod(String method) {
        return method != null && method.startsWith("PAYSTACK:");
    }
}
