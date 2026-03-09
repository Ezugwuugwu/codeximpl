package com.ecommerce.admin.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
public class NotificationClient {

    private static final Logger LOGGER = LoggerFactory.getLogger(NotificationClient.class);

    private final RestTemplate restTemplate;
    private final String notificationBaseUrl;

    public NotificationClient(RestTemplateBuilder restTemplateBuilder,
                              @Value("${services.notification.base-url:http://api-gateway:8080}") String notificationBaseUrl) {
        this.restTemplate = restTemplateBuilder.build();
        this.notificationBaseUrl = notificationBaseUrl;
    }

    public void sendSupportMessageAlert(String recipient, String subject, String body) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            restTemplate.postForEntity(
                notificationBaseUrl + "/api/notifications/test",
                new HttpEntity<>(Map.of(
                    "recipient", recipient,
                    "subject", subject,
                    "body", body
                ), headers),
                Void.class
            );
        } catch (Exception exception) {
            LOGGER.warn("Could not deliver support message alert email to {}", recipient, exception);
        }
    }
}
