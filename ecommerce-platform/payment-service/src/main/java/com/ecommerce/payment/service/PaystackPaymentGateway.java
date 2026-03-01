package com.ecommerce.payment.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

@Component
public class PaystackPaymentGateway {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String secretKey;
    private final String publicKey;

    public PaystackPaymentGateway(RestClient.Builder builder,
                                  ObjectMapper objectMapper,
                                  @Value("${payment.paystack.api-base-url:https://api.paystack.co}") String apiBaseUrl,
                                  @Value("${payment.paystack.secret-key:}") String secretKey,
                                  @Value("${payment.paystack.public-key:}") String publicKey) {
        this.restClient = builder.baseUrl(apiBaseUrl).build();
        this.objectMapper = objectMapper;
        this.secretKey = secretKey == null ? "" : secretKey.trim();
        this.publicKey = publicKey == null ? "" : publicKey.trim();
    }

    public record PaystackTransaction(String reference, String accessCode) {}

    public record PaystackVerification(String reference, String status, long amountKobo, String currency) {
        public boolean isSuccessful() {
            return "success".equalsIgnoreCase(status);
        }
    }

    public PaystackTransaction initialize(String email, BigDecimal amount, String currency) {
        ensureConfigured();
        try {
            String body = objectMapper.writeValueAsString(Map.of(
                "email", email,
                "amount", toKobo(amount),
                "currency", normalizeCurrency(currency)
            ));
            String response = restClient.post()
                .uri("/transaction/initialize")
                .header("Authorization", authHeader())
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(String.class);
            return parseInitializeResponse(response);
        } catch (RestClientResponseException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                providerErrorMessage(ex, "Paystack initialization failed."));
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Paystack initialization failed.");
        }
    }

    public PaystackVerification verify(String reference) {
        ensureConfigured();
        try {
            String response = restClient.get()
                .uri("/transaction/verify/" + reference)
                .header("Authorization", authHeader())
                .retrieve()
                .body(String.class);
            return parseVerifyResponse(response);
        } catch (RestClientResponseException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                providerErrorMessage(ex, "Paystack verification failed."));
        }
    }

    public String publicKey() {
        ensureConfigured();
        return publicKey;
    }

    public long toKobo(BigDecimal amount) {
        return amount.movePointRight(2).setScale(0, RoundingMode.HALF_UP).longValueExact();
    }

    private PaystackTransaction parseInitializeResponse(String body) {
        try {
            JsonNode data = objectMapper.readTree(body).path("data");
            String reference = data.path("reference").asText("");
            String accessCode = data.path("access_code").asText("");
            if (reference.isBlank()) {
                throw new IllegalStateException("Paystack reference is missing");
            }
            return new PaystackTransaction(reference, accessCode);
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Unable to parse Paystack response.");
        }
    }

    private PaystackVerification parseVerifyResponse(String body) {
        try {
            JsonNode data = objectMapper.readTree(body).path("data");
            String reference = data.path("reference").asText("");
            String status = data.path("status").asText("");
            long amountKobo = data.path("amount").asLong(0L);
            String currency = data.path("currency").asText("NGN");
            return new PaystackVerification(reference, status, amountKobo, currency);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "Unable to parse Paystack verification response.");
        }
    }

    private void ensureConfigured() {
        if (!secretKey.isBlank() && !publicKey.isBlank()) {
            return;
        }
        throw new ResponseStatusException(
            HttpStatus.SERVICE_UNAVAILABLE,
            "Paystack gateway is not configured. Set PAYSTACK_SECRET_KEY and PAYSTACK_PUBLIC_KEY."
        );
    }

    private String normalizeCurrency(String currency) {
        return currency == null || currency.isBlank() ? "NGN" : currency.trim().toUpperCase();
    }

    private String authHeader() {
        return "Bearer " + secretKey;
    }

    private String providerErrorMessage(RestClientResponseException ex, String fallback) {
        try {
            JsonNode json = objectMapper.readTree(ex.getResponseBodyAsString());
            String message = json.path("message").asText("");
            return message.isBlank() ? fallback : fallback + " " + message;
        } catch (Exception ignored) {
            return fallback;
        }
    }
}
