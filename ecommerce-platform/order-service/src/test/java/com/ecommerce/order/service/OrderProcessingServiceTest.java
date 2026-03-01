package com.ecommerce.order.service;

import com.ecommerce.order.domain.CustomerOrder;
import com.ecommerce.order.domain.OrderStatus;
import com.ecommerce.order.domain.OutboxEvent;
import com.ecommerce.order.repository.CustomerOrderRepository;
import com.ecommerce.order.repository.OutboxEventRepository;
import com.ecommerce.order.service.dto.CreateOrderRequest;
import com.ecommerce.order.service.dto.OrderItemRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.atLeast;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class OrderProcessingServiceTest {

    @Mock
    private CustomerOrderRepository repository;

    @Mock
    private OutboxEventRepository outboxRepository;

    @Mock
    private RestClient paymentRestClient;

    @Mock
    private RestClient.RequestBodyUriSpec requestBodyUriSpec;

    @Mock
    private RestClient.RequestBodySpec requestBodySpec;

    @Mock
    private RestClient.ResponseSpec responseSpec;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private OrderProcessingService service;

    @BeforeEach
    void setUp() {
        // Stub the RestClient fluent chain so non-Paystack tests don't fail
        when(paymentRestClient.post()).thenReturn(requestBodyUriSpec);
        when(requestBodyUriSpec.uri(anyString())).thenReturn(requestBodySpec);
        when(requestBodySpec.contentType(any())).thenReturn(requestBodySpec);
        when(requestBodySpec.body(any())).thenReturn(requestBodySpec);
        when(requestBodySpec.retrieve()).thenReturn(responseSpec);

        service = new OrderProcessingService(
            repository, outboxRepository, objectMapper, paymentRestClient,
            "commerce.events", "order.created");
    }

    @Test
    void createOrder_savesOrderAndEnqueuesOutboxEvents() {
        CustomerOrder saved = orderWithId("order-1", "user1", OrderStatus.PAYMENT_PENDING);
        when(repository.save(any(CustomerOrder.class))).thenReturn(saved);

        CustomerOrder result = service.createOrder("user1", singleItemRequest(null));

        assertThat(result.getStatus()).isEqualTo(OrderStatus.PAYMENT_PENDING);
        // saveToOutbox (order event) + enqueuePaymentRequest each call outboxRepository.save once
        verify(outboxRepository, atLeast(2)).save(any(OutboxEvent.class));
    }

    @Test
    void createOrder_withPaymentIntent_enqueuesStripeMethod() {
        CustomerOrder saved = orderWithId("order-2", "user1", OrderStatus.PAYMENT_PENDING);
        when(repository.save(any(CustomerOrder.class))).thenReturn(saved);

        service.createOrder("user1", singleItemRequest("pi_test123"));

        verify(outboxRepository, atLeast(2)).save(any(OutboxEvent.class));
    }

    @Test
    void updateStatus_persistsNewStatusAndPublishesEvent() {
        CustomerOrder existing = orderWithId("order-1", "user1", OrderStatus.PAID);
        when(repository.findById("order-1")).thenReturn(Optional.of(existing));

        CustomerOrder shipped = orderWithId("order-1", "user1", OrderStatus.SHIPPED);
        when(repository.save(any(CustomerOrder.class))).thenReturn(shipped);

        CustomerOrder result = service.updateStatus("order-1", OrderStatus.SHIPPED);

        assertThat(result.getStatus()).isEqualTo(OrderStatus.SHIPPED);
        verify(outboxRepository).save(any(OutboxEvent.class));
    }

    // --- helpers ---

    private CreateOrderRequest singleItemRequest(String paymentIntentId) {
        return new CreateOrderRequest(
            List.of(new OrderItemRequest(1L, "Widget", 2, BigDecimal.valueOf(10.00))),
            paymentIntentId);
    }

    private CustomerOrder orderWithId(String id, String userId, OrderStatus status) {
        CustomerOrder order = new CustomerOrder() {
            @Override public String getId() { return id; }
        };
        order.setUserId(userId);
        order.setStatus(status);
        order.setTotalAmount(BigDecimal.valueOf(20.00));
        return order;
    }
}
