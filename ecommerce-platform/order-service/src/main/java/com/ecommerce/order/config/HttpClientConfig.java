package com.ecommerce.order.config;

import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.ClientHttpRequestFactories;
import org.springframework.boot.web.client.ClientHttpRequestFactorySettings;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class HttpClientConfig {

    @Bean
    RestClient paymentRestClient(
            @Value("${PAYMENT_SERVICE_URL:http://payment-service:8085}") String baseUrl) {
        var settings = ClientHttpRequestFactorySettings.DEFAULTS
            .withConnectTimeout(Duration.ofSeconds(5))
            .withReadTimeout(Duration.ofSeconds(10));
        return RestClient.builder()
            .baseUrl(baseUrl)
            .requestFactory(ClientHttpRequestFactories.get(settings))
            .build();
    }
}
