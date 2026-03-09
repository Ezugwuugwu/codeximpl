package com.ecommerce.user.controller;

import com.ecommerce.user.service.UserNotificationPreferencesService;
import com.ecommerce.user.service.dto.NotificationPreferencesResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/users")
public class InternalUserController {

    private final UserNotificationPreferencesService userNotificationPreferencesService;

    public InternalUserController(UserNotificationPreferencesService userNotificationPreferencesService) {
        this.userNotificationPreferencesService = userNotificationPreferencesService;
    }

    @GetMapping("/notification-preferences")
    public ResponseEntity<NotificationPreferencesResponse> notificationPreferencesByEmail(
            @RequestParam("email") String email) {
        return ResponseEntity.ok(userNotificationPreferencesService.getPreferencesByEmail(email));
    }
}
