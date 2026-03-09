package com.ecommerce.notification.service;

import com.ecommerce.notification.model.UserNotificationPreferences;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Service
public class UserNotificationPreferencesClient {

    private static final Logger LOGGER = LoggerFactory.getLogger(UserNotificationPreferencesClient.class);

    private final RestClient restClient;

    public UserNotificationPreferencesClient(@Value("${app.user-service.base-url:http://localhost:8081}") String userServiceBaseUrl) {
        this.restClient = RestClient.builder()
            .baseUrl(userServiceBaseUrl)
            .build();
    }

    public boolean allowsOrderUpdates(String email) {
        try {
            UserNotificationPreferences preferences = restClient.get()
                .uri(uriBuilder -> uriBuilder
                    .path("/internal/users/notification-preferences")
                    .queryParam("email", email)
                    .build())
                .retrieve()
                .onStatus(HttpStatusCode::isError, (request, response) -> {
                    throw new RestClientException("User preference lookup failed with status " + response.getStatusCode());
                })
                .body(UserNotificationPreferences.class);

            return preferences == null || preferences.orderUpdatesEnabled();
        } catch (RestClientException exception) {
            LOGGER.warn("Could not load notification preferences for {}. Falling back to order updates enabled.", email);
            return true;
        }
    }
}
