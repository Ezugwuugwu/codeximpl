package com.ecommerce.notification.listener;

import com.ecommerce.notification.model.NotificationMessage;
import com.ecommerce.notification.service.EmailNotificationService;
import com.ecommerce.notification.service.UserNotificationPreferencesClient;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class CommerceEventListener {

    private static final Logger LOGGER = LoggerFactory.getLogger(CommerceEventListener.class);
    private static final DateTimeFormatter ORDER_DATE_FORMATTER = DateTimeFormatter
        .ofPattern("MMMM d, yyyy 'at' h:mm a z", Locale.US)
        .withZone(ZoneId.of("Africa/Lagos"));

    private final EmailNotificationService emailNotificationService;
    private final UserNotificationPreferencesClient userNotificationPreferencesClient;
    private final String storefrontUrl;

    public CommerceEventListener(EmailNotificationService emailNotificationService,
                                 UserNotificationPreferencesClient userNotificationPreferencesClient,
                                 @Value("${app.storefront-url:https://okangamart.com}") String storefrontUrl) {
        this.emailNotificationService = emailNotificationService;
        this.userNotificationPreferencesClient = userNotificationPreferencesClient;
        this.storefrontUrl = storefrontUrl == null || storefrontUrl.isBlank()
            ? "https://okangamart.com"
            : storefrontUrl.replaceAll("/+$", "");
    }

    @RabbitListener(queues = "order.events")
    public void onOrderEvent(Map<String, Object> payload) {
        String recipient = payload.getOrDefault("userId", "").toString();
        String orderId = payload.getOrDefault("orderId", "N/A").toString();
        String status = payload.getOrDefault("status", "UNKNOWN").toString();

        LOGGER.info("Consumed order event for order {} with status {} and recipient {}", orderId, status, recipient);

        if (recipient.isBlank()) {
            LOGGER.warn("Skipping order event for order {} because recipient is blank.", orderId);
            return;
        }

        if (!"PAID".equalsIgnoreCase(status)) {
            LOGGER.info("Skipping order event for order {} because status {} does not require a customer email.", orderId, status);
            return;
        }

        if (!userNotificationPreferencesClient.allowsOrderUpdates(recipient)) {
            LOGGER.info("Skipping paid-order email for {} because payment confirmations are disabled.", recipient);
            return;
        }

        String totalAmount = payload.getOrDefault("totalAmount", "0.00").toString();
        String createdAt = payload.getOrDefault("createdAt", "").toString();
        String paymentState = payload.getOrDefault("paymentState", "APPROVED").toString();

        emailNotificationService.send(new NotificationMessage(
            recipient,
            "Payment confirmed for order " + orderId,
            buildPaidOrderBody(orderId, totalAmount, paymentState, createdAt, payload.get("items"))));
    }

    @RabbitListener(queues = "payment.events")
    public void onPaymentEvent(Map<String, Object> payload) {
        String orderId = payload.getOrDefault("orderId", "N/A").toString();
        String status = payload.getOrDefault("status", "UNKNOWN").toString();
        LOGGER.info("Consumed payment event for order {} with status {}. Customer email is sent from paid order events only.", orderId, status);
    }

    private String buildPaidOrderBody(String orderId,
                                      String totalAmount,
                                      String paymentState,
                                      String createdAt,
                                      Object itemsPayload) {
        StringBuilder body = new StringBuilder()
            .append("Hello,\n\n")
            .append("Your payment was successful and your Okanga Mart order is now confirmed.\n\n")
            .append("Order ID: ").append(orderId).append('\n')
            .append("Payment status: ").append(formatPaymentState(paymentState)).append('\n')
            .append("Total amount: NGN ").append(totalAmount).append('\n');

        String formattedDate = formatOrderDate(createdAt);
        if (!formattedDate.isBlank()) {
            body.append("Confirmed on: ").append(formattedDate).append('\n');
        }

        List<String> itemLines = extractItemLines(itemsPayload);
        if (!itemLines.isEmpty()) {
            body.append("\nItems:\n");
            itemLines.forEach(line -> body.append("- ").append(line).append('\n'));
        }

        body.append("\nView your order on the website:\n")
            .append(storefrontUrl)
            .append("/settings?section=orders\n\n")
            .append("Thank you for shopping with Okanga Mart.");

        return body.toString();
    }

    private static String formatPaymentState(String paymentState) {
        if (paymentState == null || paymentState.isBlank()) {
            return "Successful";
        }
        String normalized = paymentState.trim().toLowerCase(Locale.US);
        if ("approved".equals(normalized) || "paid".equals(normalized) || "success".equals(normalized)) {
            return "Successful";
        }
        return Character.toUpperCase(normalized.charAt(0)) + normalized.substring(1);
    }

    private static String formatOrderDate(String createdAt) {
        if (createdAt == null || createdAt.isBlank()) {
            return "";
        }
        try {
            return ORDER_DATE_FORMATTER.format(Instant.parse(createdAt));
        } catch (RuntimeException exception) {
            return createdAt;
        }
    }

    private static List<String> extractItemLines(Object itemsPayload) {
        if (!(itemsPayload instanceof List<?> rawItems)) {
            return List.of();
        }

        return rawItems.stream()
            .filter(Map.class::isInstance)
            .map(Map.class::cast)
            .map(CommerceEventListener::formatItemLine)
            .toList();
    }

    private static String formatItemLine(Map<?, ?> item) {
        String productName = readString(item, "productName", "Item");
        String quantity = readString(item, "quantity", "1");
        String lineTotal = readString(item, "lineTotal", readString(item, "unitPrice", ""));

        if (lineTotal.isBlank()) {
            return "%s x%s".formatted(productName, quantity);
        }

        return "%s x%s - NGN %s".formatted(productName, quantity, lineTotal);
    }

    private static String readString(Map<?, ?> item, String key, String fallback) {
        Object value = item.containsKey(key) ? item.get(key) : fallback;
        if (value == null) {
            return fallback;
        }
        String normalized = value.toString();
        return normalized.isBlank() ? fallback : normalized;
    }
}
