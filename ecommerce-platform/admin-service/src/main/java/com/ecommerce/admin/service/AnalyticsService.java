package com.ecommerce.admin.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class AnalyticsService {

    private static final Set<String> PAID_ORDER_STATUSES = Set.of("PAID", "FULFILLING", "SHIPPED", "DELIVERED");
    private static final Set<String> OPEN_ORDER_STATUSES = Set.of("CREATED", "PAYMENT_PENDING", "PAID", "FULFILLING", "SHIPPED");

    private final RestClient productClient;
    private final RestClient orderClient;

    public AnalyticsService(@Qualifier("productRestClient") RestClient productClient,
                            @Qualifier("orderRestClient") RestClient orderClient) {
        this.productClient = productClient;
        this.orderClient = orderClient;
    }

    public Map<String, Object> overview(String bearerToken) {
        List<Map<String, Object>> products = fetchList(productClient, "/api/products", bearerToken);
        List<Map<String, Object>> orders = fetchList(orderClient, "/api/orders", bearerToken);

        int productCount = products.size();
        long paidOrders = orders.stream().filter(this::isPaidOrder).count();
        long openOrders = orders.stream().filter(this::isOpenOrder).count();

        BigDecimal totalRevenue = orders.stream()
            .filter(this::isPaidOrder)
            .map(this::extractTotalAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        double conversionRate = orders.isEmpty() ? 0.0 : (double) paidOrders / orders.size();
        String alerts = openOrders > 0
            ? "Orders pending fulfillment: " + openOrders
            : "No critical incidents";

        return Map.of(
            "timestamp", Instant.now().toString(),
            "productCount", productCount,
            "openOrders", openOrders,
            "paidOrders", paidOrders,
            "totalRevenue", totalRevenue.doubleValue(),
            "estimatedRevenueToday", totalRevenue.doubleValue(),
            "conversionRate", conversionRate,
            "alerts", alerts);
    }

    private List<Map<String, Object>> fetchList(RestClient client, String path, String bearerToken) {
        try {
            List<Map<String, Object>> payload = client.get()
                .uri(path)
                .headers(headers -> headers.setBearerAuth(bearerToken))
                .retrieve()
                .body(new ParameterizedTypeReference<>() {
                });
            return payload == null ? List.of() : payload;
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private boolean isPaidOrder(Map<String, Object> order) {
        return PAID_ORDER_STATUSES.contains(statusOf(order));
    }

    private boolean isOpenOrder(Map<String, Object> order) {
        return OPEN_ORDER_STATUSES.contains(statusOf(order));
    }

    private String statusOf(Map<String, Object> order) {
        Object status = order.get("status");
        return status == null ? "" : status.toString().toUpperCase();
    }

    private BigDecimal extractTotalAmount(Map<String, Object> order) {
        Object value = order.get("totalAmount");
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        try {
            return new BigDecimal(value.toString());
        } catch (NumberFormatException exception) {
            return BigDecimal.ZERO;
        }
    }
}
