package com.ecommerce.notification.controller;

import com.ecommerce.notification.model.NotificationMessage;
import com.ecommerce.notification.service.EmailNotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final EmailNotificationService service;

    public NotificationController(EmailNotificationService service) {
        this.service = service;
    }

    @PostMapping("/test")
    public ResponseEntity<Void> test(@RequestBody NotificationMessage message) {
        service.send(message);
        return ResponseEntity.accepted().build();
    }
}
