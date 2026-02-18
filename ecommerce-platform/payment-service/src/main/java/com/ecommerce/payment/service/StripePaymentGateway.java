package com.ecommerce.payment.service;

import com.ecommerce.payment.service.dto.StripePaymentIntent;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Component
public class StripePaymentGateway {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String secretKey;
    private final String publishableKey;

    public StripePaymentGateway(RestClient.Builder builder,
                                ObjectMapper objectMapper,
                                @Value("${payment.stripe.api-base-url:https://api.stripe.com}") String apiBaseUrl,
                                @Value("${payment.stripe.secret-key:}") String secretKey,
                                @Value("${payment.stripe.publishable-key:}") String publishableKey) {
        this.restClient = builder.baseUrl(apiBaseUrl).build();
        this.objectMapper = objectMapper;
        this.secretKey = secretKey == null ? "" : secretKey.trim();
        this.publishableKey = publishableKey == null ? "" : publishableKey.trim();
    }

    public StripePaymentIntent createIntent(String userId, BigDecimal amount, String currency) {
        ensureConfigured();
        Map<String, String> fields = new LinkedHashMap<>();
        fields.put("amount", String.valueOf(toMinor(amount)));
        fields.put("currency", normalizeCurrency(currency));
        fields.put("payment_method_types[]", "card");
        fields.put("metadata[userId]", userId);
        fields.put("metadata[source]", "okanga-mart");
        return parseIntent(postForm("/v1/payment_intents", fields));
    }

    public StripePaymentIntent retrieveIntent(String paymentIntentId) {
        ensureConfigured();
        try {
            String endpoint = "/v1/payment_intents/" + urlEncode(paymentIntentId);
            String response = restClient.get().uri(endpoint).header("Authorization", authHeader()).retrieve().body(String.class);
            return parseIntent(response);
        } catch (RestClientResponseException ex) {
            throw new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                providerErrorMessage(ex, "Card payment verification failed.")
            );
        }
    }

    public String publishableKey() {
        ensureConfigured();
        return publishableKey;
    }

    public long toMinor(BigDecimal amount) {
        return amount.movePointRight(2).setScale(0, RoundingMode.HALF_UP).longValueExact();
    }

    private String postForm(String path, Map<String, String> fields) {
        String payload = fields.entrySet().stream()
            .map(entry -> urlEncode(entry.getKey()) + "=" + urlEncode(entry.getValue()))
            .collect(Collectors.joining("&"));
        try {
            return restClient.post()
                .uri(path)
                .header("Authorization", authHeader())
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(payload)
                .retrieve()
                .body(String.class);
        } catch (RestClientResponseException ex) {
            throw new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                providerErrorMessage(ex, "Card payment initialization failed.")
            );
        }
    }

    private StripePaymentIntent parseIntent(String body) {
        try {
            JsonNode json = objectMapper.readTree(body);
            String id = json.path("id").asText("");
            if (id.isBlank()) {
                throw new IllegalStateException("Stripe payment intent id is missing.");
            }
            return new StripePaymentIntent(
                id,
                json.path("client_secret").asText(""),
                json.path("status").asText(""),
                json.path("amount").asLong(0L),
                json.path("currency").asText("usd")
            );
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Unable to parse payment provider response.");
        }
    }

    private void ensureConfigured() {
        if (!secretKey.isBlank() && !publishableKey.isBlank()) {
            return;
        }
        throw new ResponseStatusException(
            HttpStatus.SERVICE_UNAVAILABLE,
            "Card payment gateway is not configured. Set STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY."
        );
    }

    private String normalizeCurrency(String currency) {
        return currency == null ? "usd" : currency.trim().toLowerCase(Locale.ROOT);
    }

    private String authHeader() {
        return "Bearer " + secretKey;
    }

    private String providerErrorMessage(RestClientResponseException ex, String fallback) {
        try {
            JsonNode error = objectMapper.readTree(ex.getResponseBodyAsString()).path("error");
            String providerMessage = error.path("message").asText("");
            String providerCode = error.path("code").asText("");
            if (providerMessage.isBlank()) {
                return fallback;
            }
            if (providerCode.isBlank()) {
                return fallback + " " + providerMessage;
            }
            return fallback + " " + providerMessage + " (provider_code=" + providerCode + ")";
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private String urlEncode(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }
}
