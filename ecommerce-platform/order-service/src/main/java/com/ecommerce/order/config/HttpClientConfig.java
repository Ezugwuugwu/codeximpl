package com.ecommerce.order.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class HttpClientConfig {

    @Bean
    RestClient paymentRestClient(
            @Value("${PAYMENT_SERVICE_URL:http://payment-service:8085}") String baseUrl) {
        return RestClient.builder().baseUrl(baseUrl).build();
    }
}
