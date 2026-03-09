package com.ecommerce.notification.model;

public record UserNotificationPreferences(
    boolean orderUpdatesEnabled,
    boolean accountAlertsEnabled,
    boolean marketingEmailsEnabled
) {
}
