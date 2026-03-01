package com.ecommerce.admin.service;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Answers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceTest {

    // RETURNS_DEEP_STUBS lets us stub the full fluent chain in a single when() call,
    // avoiding individual mocks for each RestClient chain step and the wildcard
    // generic casts that cause IDE type-safety errors.
    @Mock(answer = Answers.RETURNS_DEEP_STUBS)
    private RestClient productClient;

    @Mock(answer = Answers.RETURNS_DEEP_STUBS)
    private RestClient orderClient;

    private AnalyticsService service;

    @BeforeEach
    void setUp() {
        service = new AnalyticsService(productClient, orderClient);
    }

    @Test
    void overview_productsAndOrders_computesRevenueAndCounts() {
        stubClient(productClient, List.of(
            Map.of("id", 1, "name", "Widget"),
            Map.of("id", 2, "name", "Gadget")));

        stubClient(orderClient, List.of(
            Map.of("status", "PAID",    "totalAmount", 100.00),
            Map.of("status", "CREATED", "totalAmount",  50.00)));

        Map<String, Object> result = service.overview("Bearer test");

        assertThat(result.get("productCount")).isEqualTo(2);
        assertThat((Long) result.get("paidOrders")).isEqualTo(1L);
        assertThat((Long) result.get("openOrders")).isEqualTo(2L); // CREATED + PAID are both "open"
        assertThat((Double) result.get("totalRevenue")).isEqualTo(100.0);
        assertThat((Double) result.get("conversionRate")).isEqualTo(0.5);
    }

    @Test
    void overview_productServiceDown_returnsZeroProducts() {
        when(productClient.get()).thenThrow(new RuntimeException("connection refused"));

        stubClient(orderClient, List.of());

        Map<String, Object> result = service.overview("Bearer test");

        assertThat(result.get("productCount")).isEqualTo(0);
    }

    @Test
    void overview_noOrders_conversionRateIsZero() {
        stubClient(productClient, List.of());
        stubClient(orderClient, List.of());

        Map<String, Object> result = service.overview("Bearer test");

        assertThat((Double) result.get("conversionRate")).isEqualTo(0.0);
        assertThat(result.get("alerts")).isEqualTo("No critical incidents");
    }

    @SuppressWarnings("unchecked")
    private void stubClient(RestClient client, List<Map<String, Object>> data) {
        when(client.get()
            .uri(anyString())
            .headers(any())
            .retrieve()
            .body(any(ParameterizedTypeReference.class)))
            .thenReturn(data);
    }
}
