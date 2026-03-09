package com.ecommerce.user.service.dto;

import com.ecommerce.user.domain.AppUser;

public record NotificationPreferencesResponse(
    boolean orderUpdatesEnabled,
    boolean accountAlertsEnabled,
    boolean marketingEmailsEnabled
) {

    public static NotificationPreferencesResponse from(AppUser user) {
        return new NotificationPreferencesResponse(
            user.isOrderUpdatesEnabled(),
            user.isAccountAlertsEnabled(),
            user.isMarketingEmailsEnabled()
        );
    }
}
