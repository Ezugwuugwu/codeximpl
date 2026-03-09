package com.ecommerce.user.service.dto;

public record UpdateNotificationPreferencesRequest(
    boolean orderUpdatesEnabled,
    boolean accountAlertsEnabled,
    boolean marketingEmailsEnabled
) {
}
