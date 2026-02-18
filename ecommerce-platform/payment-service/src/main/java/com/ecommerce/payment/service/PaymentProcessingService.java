package com.ecommerce.payment.service;

import com.ecommerce.payment.domain.PaymentStatus;
import com.ecommerce.payment.domain.PaymentTransaction;
import com.ecommerce.payment.repository.PaymentTransactionRepository;
import com.ecommerce.payment.service.dto.PaymentIntentCreateRequest;
import com.ecommerce.payment.service.dto.PaymentIntentCreateResponse;
import com.ecommerce.payment.service.dto.PaymentProcessRequest;
import com.ecommerce.payment.service.dto.PaymentProcessResponse;
import com.ecommerce.payment.service.dto.StripePaymentIntent;
import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class PaymentProcessingService {

    private final PaymentTransactionRepository repository;
    private final StripePaymentGateway stripeGateway;
    private final RabbitTemplate rabbitTemplate;
    private final String exchange;
    private final String routingKey;

    public PaymentProcessingService(PaymentTransactionRepository repository,
                                    StripePaymentGateway stripeGateway,
                                    RabbitTemplate rabbitTemplate,
                                    @Value("${messaging.exchange.commerce:commerce.events}") String exchange,
                                    @Value("${messaging.routing.payment-processed:payment.processed}") String routingKey) {
        this.repository = repository;
        this.stripeGateway = stripeGateway;
        this.rabbitTemplate = rabbitTemplate;
        this.exchange = exchange;
        this.routingKey = routingKey;
    }

    public PaymentIntentCreateResponse createIntent(PaymentIntentCreateRequest request) {
        StripePaymentIntent intent = stripeGateway.createIntent(request.userId(), request.amount(), request.currency());
        return new PaymentIntentCreateResponse(
            intent.id(),
            intent.clientSecret(),
            stripeGateway.publishableKey(),
            intent.status()
        );
    }

    public PaymentProcessResponse process(PaymentProcessRequest request) {
        if (isStripeMethod(request.method())) {
            return processStripePayment(request, extractStripeIntentId(request.method()));
        }
        return processFallbackPayment(request);
    }

    private PaymentProcessResponse processFallbackPayment(PaymentProcessRequest request) {
        PaymentTransaction transaction = baseTransaction(request, request.method(), null);
        transaction.setStatus(request.amount().doubleValue() <= 0 ? PaymentStatus.DECLINED : PaymentStatus.APPROVED);
        PaymentTransaction saved = saveAndPublish(transaction);
        return new PaymentProcessResponse(saved.getId(), saved.getStatus().name(), "Payment processed");
    }

    private PaymentProcessResponse processStripePayment(PaymentProcessRequest request, String intentId) {
        PaymentTransaction transaction = baseTransaction(request, "STRIPE", intentId);
        StripePaymentIntent intent = stripeGateway.retrieveIntent(intentId);
        PaymentStatus status = resolveStripeStatus(request, intent);
        transaction.setStatus(status);
        PaymentTransaction saved = saveAndPublish(transaction);
        String message = status == PaymentStatus.APPROVED ? "Stripe card payment verified" : "Stripe card payment not verified";
        return new PaymentProcessResponse(saved.getId(), status.name(), message);
    }

    private PaymentStatus resolveStripeStatus(PaymentProcessRequest request, StripePaymentIntent intent) {
        if (!intent.isSucceeded()) {
            return PaymentStatus.DECLINED;
        }
        if (stripeGateway.toMinor(request.amount()) != intent.amountMinor()) {
            return PaymentStatus.DECLINED;
        }
        Optional<PaymentTransaction> existing = repository.findTopByProviderReference(intent.id());
        if (existing.isPresent() && !request.orderId().equals(existing.get().getOrderId())) {
            return PaymentStatus.DECLINED;
        }
        return PaymentStatus.APPROVED;
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

    private PaymentTransaction saveAndPublish(PaymentTransaction transaction) {
        PaymentTransaction saved = repository.save(transaction);
        rabbitTemplate.convertAndSend(exchange, routingKey, Map.of(
            "paymentId", saved.getId(),
            "orderId", saved.getOrderId(),
            "userId", saved.getUserId(),
            "amount", saved.getAmount().toString(),
            "status", saved.getStatus().name(),
            "provider", saved.getProvider(),
            "providerReference", saved.getProviderReference() == null ? "" : saved.getProviderReference()));
        return saved;
    }

    private BigDecimal safeAmount(BigDecimal amount) {
        return amount == null ? BigDecimal.ZERO : amount;
    }

    private boolean isStripeMethod(String method) {
        return method != null && method.startsWith("STRIPE:");
    }

    private String extractStripeIntentId(String method) {
        String[] parts = method.split(":", 2);
        return parts.length == 2 ? parts[1].trim() : "";
    }
}
