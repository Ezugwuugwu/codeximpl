package com.ecommerce.payment.service;

import com.ecommerce.payment.domain.OutboxEvent;
import com.ecommerce.payment.domain.PaymentStatus;
import com.ecommerce.payment.domain.PaymentTransaction;
import com.ecommerce.payment.repository.OutboxEventRepository;
import com.ecommerce.payment.repository.PaymentTransactionRepository;
import com.ecommerce.payment.service.dto.PaymentProcessRequest;
import com.ecommerce.payment.service.dto.PaymentProcessResponse;
import com.ecommerce.payment.service.dto.PaystackInitializeRequest;
import com.ecommerce.payment.service.dto.PaystackInitializeResponse;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class PaymentProcessingService {

    private final PaymentTransactionRepository repository;
    private final OutboxEventRepository outboxRepository;
    private final ObjectMapper objectMapper;
    private final PaystackPaymentGateway paystackGateway;
    private final String exchange;
    private final String routingKey;

    public PaymentProcessingService(PaymentTransactionRepository repository,
                                    OutboxEventRepository outboxRepository,
                                    ObjectMapper objectMapper,
                                    PaystackPaymentGateway paystackGateway,
                                    @Value("${messaging.exchange.commerce:commerce.events}") String exchange,
                                    @Value("${messaging.routing.payment-processed:payment.processed}") String routingKey) {
        this.repository = repository;
        this.outboxRepository = outboxRepository;
        this.objectMapper = objectMapper;
        this.paystackGateway = paystackGateway;
        this.exchange = exchange;
        this.routingKey = routingKey;
    }

    public PaystackInitializeResponse initializePaystack(PaystackInitializeRequest request) {
        String currency = request.currency() == null || request.currency().isBlank() ? "NGN" : request.currency();
        PaystackPaymentGateway.PaystackTransaction tx =
            paystackGateway.initialize(request.email(), request.amount(), currency);
        return new PaystackInitializeResponse(tx.reference(), tx.accessCode(), paystackGateway.publicKey());
    }

    @Transactional
    public PaymentProcessResponse process(PaymentProcessRequest request) {
        // Idempotency: if this order already has an APPROVED transaction, return it as-is.
        // Covers duplicate HTTP requests, network retries, and double-clicks.
        Optional<PaymentTransaction> approved =
            repository.findByOrderIdAndStatus(request.orderId(), PaymentStatus.APPROVED);
        if (approved.isPresent()) {
            PaymentTransaction tx = approved.get();
            return new PaymentProcessResponse(tx.getId(), tx.getStatus().name(), "Payment already processed");
        }

        if (isPaystackMethod(request.method())) {
            return processPaystackPayment(request, extractPaystackReference(request.method()));
        }
        return processFallbackPayment(request);
    }

    private PaymentProcessResponse processFallbackPayment(PaymentProcessRequest request) {
        PaymentTransaction transaction = baseTransaction(request, request.method(), null);
        transaction.setStatus(request.amount().doubleValue() <= 0 ? PaymentStatus.DECLINED : PaymentStatus.APPROVED);
        PaymentTransaction saved = saveAndEnqueue(transaction);
        return new PaymentProcessResponse(saved.getId(), saved.getStatus().name(), "Payment processed");
    }

    private PaymentTransaction baseTransaction(PaymentProcessRequest request, String provider, String providerReference) {
        PaymentTransaction transaction = new PaymentTransaction();
        transaction.setOrderId(request.orderId());
        transaction.setUserId(request.userId());
        transaction.setAmount(safeAmount(request.amount()));
        transaction.setCurrency(request.currency());
        transaction.setProvider(provider);
        transaction.setProviderReference(providerReference);
        return transaction;
    }

    private PaymentTransaction saveAndEnqueue(PaymentTransaction transaction) {
        PaymentTransaction saved = repository.save(transaction);
        try {
            String payload = objectMapper.writeValueAsString(Map.of(
                "paymentId", saved.getId(),
                "orderId", saved.getOrderId(),
                "userId", saved.getUserId(),
                "amount", saved.getAmount().toString(),
                "status", saved.getStatus().name(),
                "provider", saved.getProvider(),
                "providerReference", saved.getProviderReference() == null ? "" : saved.getProviderReference()));
            outboxRepository.save(new OutboxEvent(exchange, routingKey, payload));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize payment event", e);
        }
        return saved;
    }

    private BigDecimal safeAmount(BigDecimal amount) {
        return amount == null ? BigDecimal.ZERO : amount;
    }

    private boolean isPaystackMethod(String method) {
        return method != null && method.startsWith("PAYSTACK:");
    }

    private String extractPaystackReference(String method) {
        String[] parts = method.split(":", 2);
        return parts.length == 2 ? parts[1].trim() : "";
    }

    private PaymentProcessResponse processPaystackPayment(PaymentProcessRequest request, String reference) {
        PaymentTransaction transaction = baseTransaction(request, "PAYSTACK", reference);
        PaystackPaymentGateway.PaystackVerification verification = paystackGateway.verify(reference);
        PaymentStatus status = resolvePaystackStatus(request, verification);
        transaction.setStatus(status);
        PaymentTransaction saved = saveAndEnqueue(transaction);
        String message = status == PaymentStatus.APPROVED
            ? "Paystack payment verified"
            : "Paystack payment not verified";
        return new PaymentProcessResponse(saved.getId(), status.name(), message);
    }

    private PaymentStatus resolvePaystackStatus(PaymentProcessRequest request,
                                                PaystackPaymentGateway.PaystackVerification verification) {
        if (!verification.isSuccessful()) {
            return PaymentStatus.DECLINED;
        }
        if (paystackGateway.toKobo(request.amount()) != verification.amountKobo()) {
            return PaymentStatus.DECLINED;
        }
        // Prevent reuse of the same Paystack reference across orders.
        if (repository.findTopByProviderReference(verification.reference()).isPresent()) {
            return PaymentStatus.DECLINED;
        }
        return PaymentStatus.APPROVED;
    }
}
