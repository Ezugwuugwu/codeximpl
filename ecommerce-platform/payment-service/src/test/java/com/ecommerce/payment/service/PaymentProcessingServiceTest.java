package com.ecommerce.payment.service;

import com.ecommerce.payment.domain.OutboxEvent;
import com.ecommerce.payment.domain.PaymentStatus;
import com.ecommerce.payment.domain.PaymentTransaction;
import com.ecommerce.payment.repository.OutboxEventRepository;
import com.ecommerce.payment.repository.PaymentTransactionRepository;
import com.ecommerce.payment.service.dto.PaymentIntentCreateRequest;
import com.ecommerce.payment.service.dto.PaymentIntentCreateResponse;
import com.ecommerce.payment.service.dto.PaymentProcessRequest;
import com.ecommerce.payment.service.dto.PaymentProcessResponse;
import com.ecommerce.payment.service.dto.StripePaymentIntent;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentProcessingServiceTest {

    @Mock
    private PaymentTransactionRepository repository;

    @Mock
    private OutboxEventRepository outboxRepository;

    @Mock
    private StripePaymentGateway cardGateway;

    @Mock
    private PaystackPaymentGateway paystackGateway;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private PaymentProcessingService service;

    @BeforeEach
    void setUp() {
        service = new PaymentProcessingService(
            repository, outboxRepository, objectMapper, cardGateway, paystackGateway,
            "commerce.events", "payment.processed");
    }

    @Test
    void process_fallbackMethod_positiveAmount_approved() {
        PaymentTransaction saved = savedTransaction("pay-1", PaymentStatus.APPROVED);
        when(repository.save(any(PaymentTransaction.class))).thenReturn(saved);

        PaymentProcessResponse response = service.process(
            new PaymentProcessRequest("ord-1", "user1", BigDecimal.valueOf(50.00), "USD", "CARD"));

        assertThat(response.status()).isEqualTo("APPROVED");
        verify(outboxRepository).save(any(OutboxEvent.class));
    }

    @Test
    void process_fallbackMethod_zeroAmount_declined() {
        PaymentTransaction saved = savedTransaction("pay-2", PaymentStatus.DECLINED);
        when(repository.save(any(PaymentTransaction.class))).thenReturn(saved);

        PaymentProcessResponse response = service.process(
            new PaymentProcessRequest("ord-1", "user1", BigDecimal.ZERO, "USD", "CARD"));

        assertThat(response.status()).isEqualTo("DECLINED");
    }

    @Test
    void process_cardPaymentMethod_succeededIntentWithMatchingAmount_approved() {
        StripePaymentIntent intent = new StripePaymentIntent(
            "pi_test", "secret", "succeeded", 5000L, "usd");
        when(cardGateway.retrieveIntent("pi_test")).thenReturn(intent);
        when(cardGateway.toMinor(BigDecimal.valueOf(50.00))).thenReturn(5000L);
        when(repository.findTopByProviderReference("pi_test")).thenReturn(Optional.empty());

        PaymentTransaction saved = savedTransaction("pay-3", PaymentStatus.APPROVED);
        when(repository.save(any(PaymentTransaction.class))).thenReturn(saved);

        PaymentProcessResponse response = service.process(
            new PaymentProcessRequest("ord-1", "user1", BigDecimal.valueOf(50.00), "USD", "STRIPE:pi_test"));

        assertThat(response.status()).isEqualTo("APPROVED");
    }

    @Test
    void createCardIntent_delegatesToGatewayAndReturnsResponse() {
        StripePaymentIntent intent = new StripePaymentIntent(
            "pi_new", "cs_new", "requires_payment_method", 1000L, "usd");
        when(cardGateway.createIntent("user1", BigDecimal.valueOf(10.00), "USD")).thenReturn(intent);
        when(cardGateway.publishableKey()).thenReturn("pk_test_key");

        PaymentIntentCreateResponse response = service.createIntent(
            new PaymentIntentCreateRequest("user1", BigDecimal.valueOf(10.00), "USD"));

        assertThat(response.paymentIntentId()).isEqualTo("pi_new");
        assertThat(response.publishableKey()).isEqualTo("pk_test_key");
    }

    @Test
    void process_paystackMethod_verifiedReferenceWithMatchingAmount_approved() {
        PaystackPaymentGateway.PaystackVerification verification =
            new PaystackPaymentGateway.PaystackVerification("ref_test", "success", 5000L, "NGN");
        when(paystackGateway.verify("ref_test")).thenReturn(verification);
        when(paystackGateway.toKobo(BigDecimal.valueOf(50.00))).thenReturn(5000L);
        when(repository.findTopByProviderReference("ref_test")).thenReturn(Optional.empty());

        PaymentTransaction saved = savedTransaction("pay-4", PaymentStatus.APPROVED);
        when(repository.save(any(PaymentTransaction.class))).thenReturn(saved);

        PaymentProcessResponse response = service.process(
            new PaymentProcessRequest("ord-1", "user1", BigDecimal.valueOf(50.00), "NGN", "PAYSTACK:ref_test"));

        assertThat(response.status()).isEqualTo("APPROVED");
    }

    @Test
    void process_paystackMethod_failedVerification_declined() {
        PaystackPaymentGateway.PaystackVerification verification =
            new PaystackPaymentGateway.PaystackVerification("ref_fail", "failed", 0L, "NGN");
        when(paystackGateway.verify("ref_fail")).thenReturn(verification);

        PaymentTransaction saved = savedTransaction("pay-5", PaymentStatus.DECLINED);
        when(repository.save(any(PaymentTransaction.class))).thenReturn(saved);

        PaymentProcessResponse response = service.process(
            new PaymentProcessRequest("ord-1", "user1", BigDecimal.valueOf(50.00), "NGN", "PAYSTACK:ref_fail"));

        assertThat(response.status()).isEqualTo("DECLINED");
    }

    private PaymentTransaction savedTransaction(String id, PaymentStatus status) {
        // Override getId() because JPA-generated UUID is null outside a persistence context
        PaymentTransaction t = new PaymentTransaction() {
            @Override public String getId() { return id; }
        };
        t.setOrderId("ord-1");
        t.setUserId("user1");
        t.setAmount(BigDecimal.valueOf(50.00));
        t.setCurrency("USD");
        t.setProvider("CARD");
        t.setStatus(status);
        return t;
    }
}
