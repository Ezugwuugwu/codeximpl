package com.ecommerce.user.service;

import com.ecommerce.user.domain.AppUser;
import com.ecommerce.user.repository.AppUserRepository;
import com.ecommerce.user.service.dto.NotificationPreferencesResponse;
import com.ecommerce.user.service.dto.UpdateNotificationPreferencesRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

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

    @Transactional(readOnly = true)
    public NotificationPreferencesResponse getPreferencesByEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        }

        AppUser user = repository.findByEmail(email.trim().toLowerCase())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return NotificationPreferencesResponse.from(user);
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
