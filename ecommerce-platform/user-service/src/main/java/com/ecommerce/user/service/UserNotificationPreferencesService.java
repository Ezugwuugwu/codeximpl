package com.ecommerce.user.service;

import com.ecommerce.user.domain.AppUser;
import com.ecommerce.user.repository.AppUserRepository;
import com.ecommerce.user.service.dto.NotificationPreferencesResponse;
import com.ecommerce.user.service.dto.UpdateNotificationPreferencesRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserNotificationPreferencesService {

    private final AppUserRepository repository;
    private final CurrentUserService currentUserService;

    public UserNotificationPreferencesService(AppUserRepository repository,
                                              CurrentUserService currentUserService) {
        this.repository = repository;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public NotificationPreferencesResponse getCurrentPreferences(AppUser authenticatedUser) {
        return NotificationPreferencesResponse.from(currentUserService.requireCurrentUser(authenticatedUser));
    }

    @Transactional
    public NotificationPreferencesResponse updateCurrentPreferences(AppUser authenticatedUser,
                                                                   UpdateNotificationPreferencesRequest request) {
        AppUser user = currentUserService.requireCurrentUser(authenticatedUser);
        user.setOrderUpdatesEnabled(request.orderUpdatesEnabled());
        user.setAccountAlertsEnabled(request.accountAlertsEnabled());
        user.setMarketingEmailsEnabled(request.marketingEmailsEnabled());
        return NotificationPreferencesResponse.from(repository.save(user));
    }
}
