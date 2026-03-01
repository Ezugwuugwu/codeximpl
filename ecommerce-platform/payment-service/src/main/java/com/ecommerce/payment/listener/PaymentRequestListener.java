package com.ecommerce.payment.listener;

import com.ecommerce.payment.service.PaymentProcessingService;
import com.ecommerce.payment.service.dto.PaymentProcessRequest;
import java.math.BigDecimal;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class PaymentRequestListener {

    private static final Logger log = LoggerFactory.getLogger(PaymentRequestListener.class);

    private final PaymentProcessingService service;

    public PaymentRequestListener(PaymentProcessingService service) {
        this.service = service;
    }

    @RabbitListener(queues = "payment.requests")
    public void onPaymentRequest(Map<String, Object> payload) {
        String orderId = payload.getOrDefault("orderId", "").toString();
        String userId  = payload.getOrDefault("userId",  "").toString();
        String amount  = payload.getOrDefault("amount",  "0").toString();
        String currency = payload.getOrDefault("currency", "USD").toString();
        String method  = payload.getOrDefault("method",  "CARD").toString();

        if (orderId.isBlank() || userId.isBlank()) {
            log.warn("Dropping payment request with missing orderId or userId");
            return;
        }

        try {
            service.process(new PaymentProcessRequest(
                orderId, userId, new BigDecimal(amount), currency, method));
        } catch (Exception e) {
            log.error("Failed to process payment for order {}: {}", orderId, e.getMessage());
            // Re-throw so RabbitMQ redelivers the message (or routes to dead-letter queue).
            throw e;
        }
    }
}
