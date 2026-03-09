package com.ecommerce.order.service;

import com.ecommerce.order.domain.CustomerOrder;
import com.ecommerce.order.domain.OrderItem;
import com.ecommerce.order.domain.OrderStatus;
import com.ecommerce.order.domain.OutboxEvent;
import com.ecommerce.order.repository.CustomerOrderRepository;
import com.ecommerce.order.repository.OutboxEventRepository;
import com.ecommerce.order.service.dto.CreateGuestOrderRequest;
import com.ecommerce.order.service.dto.CreateOrderRequest;
import com.ecommerce.order.service.dto.GuestCustomerRequest;
import com.ecommerce.order.service.dto.OrderItemRequest;
import com.ecommerce.order.service.dto.PaymentRequest;
import com.ecommerce.order.service.dto.PaymentResponse;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
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
        CustomerOrder order = initializeOrder(userId, request.items());
        order.setGuestCheckout(false);
        order.setCustomerEmail(normalizeEmail(userId));
        CustomerOrder saved = repository.save(order);
        finalizeOrder(saved, request.paymentIntentId());
        return saved;
    }

    @Transactional
    public CustomerOrder createGuestOrder(CreateGuestOrderRequest request) {
        String guestEmail = normalizeEmail(request.customer().email());
        CustomerOrder order = initializeOrder(guestEmail, request.items());
        order.setGuestCheckout(true);
        applyGuestCustomer(order, request.customer());
        CustomerOrder saved = repository.save(order);
        finalizeOrder(saved, request.paymentIntentId());
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

    private CustomerOrder initializeOrder(String userId, List<OrderItemRequest> itemRequests) {
        CustomerOrder order = new CustomerOrder();
        order.setUserId(userId);
        order.setStatus(OrderStatus.PAYMENT_PENDING);

        BigDecimal total = BigDecimal.ZERO;
        for (OrderItemRequest itemRequest : itemRequests) {
            OrderItem item = new OrderItem();
            item.setProductId(itemRequest.productId());
            item.setProductName(itemRequest.productName());
            item.setQuantity(itemRequest.quantity());
            item.setUnitPrice(itemRequest.unitPrice());
            total = total.add(itemRequest.unitPrice().multiply(BigDecimal.valueOf(itemRequest.quantity())));
            order.addItem(item);
        }

        order.setTotalAmount(total);
        return order;
    }

    private void finalizeOrder(CustomerOrder order, String paymentIntentId) {
        saveToOutbox(order, "PENDING");

        String resolvedMethod = resolvePaymentMethod(paymentIntentId);
        if (isPaystackMethod(resolvedMethod)) {
            verifyPaystackPaymentSync(order, resolvedMethod);
            return;
        }

        enqueuePaymentRequest(order, resolvedMethod);
    }

    private void applyGuestCustomer(CustomerOrder order, GuestCustomerRequest customer) {
        order.setCustomerEmail(normalizeEmail(customer.email()));
        order.setCustomerFirstName(customer.firstName().trim());
        order.setCustomerLastName(customer.lastName().trim());
        order.setShippingStreetAddress(customer.streetAddress().trim());
        order.setShippingCity(customer.city().trim());
        order.setShippingState(customer.state().trim());
        order.setShippingPostalCode(customer.postalCode().trim());
        order.setShippingCountry(customer.country().trim());
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
                saveToOutbox(order, response.status());
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
            List<Map<String, Object>> items = order.getItems().stream()
                .map(this::toItemPayload)
                .toList();
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("orderId", order.getId());
            payload.put("userId", order.getUserId());
            payload.put("recipientEmail", resolveRecipientEmail(order));
            payload.put("status", order.getStatus().name());
            payload.put("paymentState", paymentState);
            payload.put("totalAmount", order.getTotalAmount().toString());
            payload.put("createdAt", order.getCreatedAt().toString());
            payload.put("guestCheckout", order.isGuestCheckout());
            payload.put("customerEmail", order.getCustomerEmail());
            payload.put("customerFirstName", order.getCustomerFirstName());
            payload.put("customerLastName", order.getCustomerLastName());
            payload.put("shippingStreetAddress", order.getShippingStreetAddress());
            payload.put("shippingCity", order.getShippingCity());
            payload.put("shippingState", order.getShippingState());
            payload.put("shippingPostalCode", order.getShippingPostalCode());
            payload.put("shippingCountry", order.getShippingCountry());
            payload.put("items", items);
            outboxRepository.save(new OutboxEvent(orderExchange, orderRoutingKey, objectMapper.writeValueAsString(payload)));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize order event", e);
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
        String candidate = order.getCustomerEmail();
        if (candidate != null && !candidate.isBlank()) {
            return candidate;
        }
        return order.getUserId();
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.US);
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
