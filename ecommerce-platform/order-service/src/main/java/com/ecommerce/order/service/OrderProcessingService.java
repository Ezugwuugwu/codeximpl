package com.ecommerce.order.service;

import com.ecommerce.order.domain.CustomerOrder;
import com.ecommerce.order.domain.OrderItem;
import com.ecommerce.order.domain.OrderStatus;
import com.ecommerce.order.repository.CustomerOrderRepository;
import com.ecommerce.order.service.dto.CreateOrderRequest;
import com.ecommerce.order.service.dto.OrderItemRequest;
import com.ecommerce.order.service.dto.PaymentRequest;
import com.ecommerce.order.service.dto.PaymentResponse;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@Service
public class OrderProcessingService {

    private final CustomerOrderRepository repository;
    private final RabbitTemplate rabbitTemplate;
    private final RestClient paymentClient;
    private final String orderExchange;
    private final String orderRoutingKey;

    public OrderProcessingService(CustomerOrderRepository repository,
                                  RabbitTemplate rabbitTemplate,
                                  RestClient paymentClient,
                                  @Value("${messaging.exchange.commerce:commerce.events}") String orderExchange,
                                  @Value("${messaging.routing.order-created:order.created}") String orderRoutingKey) {
        this.repository = repository;
        this.rabbitTemplate = rabbitTemplate;
        this.paymentClient = paymentClient;
        this.orderExchange = orderExchange;
        this.orderRoutingKey = orderRoutingKey;
    }

    @Transactional
    public CustomerOrder createOrder(CreateOrderRequest request) {
        CustomerOrder order = new CustomerOrder();
        order.setUserId(request.userId());

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

        PaymentResponse paymentResponse = processPaymentWithResilience(new PaymentRequest(
            saved.getId(),
            saved.getUserId(),
            saved.getTotalAmount(),
            "USD",
            resolvePaymentMethod(request.paymentIntentId())));

        if ("APPROVED".equalsIgnoreCase(paymentResponse.status())) {
            saved.setStatus(OrderStatus.PAID);
        } else {
            saved.setStatus(OrderStatus.PAYMENT_PENDING);
        }

        CustomerOrder persisted = repository.save(saved);
        publishOrderEvent(persisted, paymentResponse.status());
        return persisted;
    }

    public CustomerOrder getById(String orderId) {
        return repository.findById(orderId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
    }

    public List<CustomerOrder> getByUser(String userId) {
        return repository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<CustomerOrder> listAllOrders() {
        return repository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional
    public CustomerOrder updateStatus(String orderId, OrderStatus status) {
        CustomerOrder order = getById(orderId);
        order.setStatus(status);
        CustomerOrder saved = repository.save(order);
        publishOrderEvent(saved, status.name());
        return saved;
    }

    @Retryable(maxAttempts = 3, backoff = @Backoff(delay = 500))
    @CircuitBreaker(name = "paymentService", fallbackMethod = "paymentFallback")
    public PaymentResponse processPaymentWithResilience(PaymentRequest request) {
        PaymentResponse response = paymentClient.post()
            .uri("/api/payments/process")
            .body(request)
            .retrieve()
            .body(PaymentResponse.class);

        if (response == null) {
            throw new IllegalStateException("Payment service returned empty response");
        }
        return response;
    }

    public PaymentResponse paymentFallback(PaymentRequest request, Throwable throwable) {
        return new PaymentResponse(null, "PENDING", "Payment fallback applied at " + Instant.now());
    }

    private void publishOrderEvent(CustomerOrder order, String paymentState) {
        rabbitTemplate.convertAndSend(orderExchange, orderRoutingKey, Map.of(
            "orderId", order.getId(),
            "userId", order.getUserId(),
            "status", order.getStatus().name(),
            "paymentState", paymentState,
            "totalAmount", order.getTotalAmount().toString(),
            "createdAt", order.getCreatedAt().toString()));
    }

    private String resolvePaymentMethod(String paymentIntentId) {
        if (paymentIntentId == null || paymentIntentId.isBlank()) {
            return "CARD";
        }
        return "STRIPE:" + paymentIntentId.trim();
    }
}
