package com.ecommerce.payment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class StripePaymentGatewayTest {

    private StripePaymentGateway gatewayConfigured;
    private StripePaymentGateway gatewayUnconfigured;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        gatewayConfigured = new StripePaymentGateway(
            builder, new ObjectMapper(),
            "https://api.stripe.com", "sk_test_secret", "pk_test_publishable");
        gatewayUnconfigured = new StripePaymentGateway(
            RestClient.builder(), new ObjectMapper(),
            "https://api.stripe.com", "", "");
    }

    @Test
    void toMinor_100dollars_returns10000() {
        long minor = gatewayConfigured.toMinor(BigDecimal.valueOf(100.00));

        assertThat(minor).isEqualTo(10000L);
    }

    @Test
    void toMinor_oneAndHalfDollars_returns150() {
        long minor = gatewayConfigured.toMinor(BigDecimal.valueOf(1.50));

        assertThat(minor).isEqualTo(150L);
    }

    @Test
    void toMinor_halfCent_roundsHalfUp() {
        // $0.005 → rounds to 1 minor unit
        long minor = gatewayConfigured.toMinor(new BigDecimal("0.005"));

        assertThat(minor).isEqualTo(1L);
    }

    @Test
    void publishableKey_whenNotConfigured_throwsServiceUnavailable() {
        assertThatThrownBy(() -> gatewayUnconfigured.publishableKey())
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.SERVICE_UNAVAILABLE));
    }
}
