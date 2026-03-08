package com.ecommerce.admin.config;

import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.ClientHttpRequestFactories;
import org.springframework.boot.web.client.ClientHttpRequestFactorySettings;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class RestClientConfig {

    private static final ClientHttpRequestFactorySettings TIMEOUT_SETTINGS =
        ClientHttpRequestFactorySettings.DEFAULTS
            .withConnectTimeout(Duration.ofSeconds(5))
            .withReadTimeout(Duration.ofSeconds(10));

    @Bean("productRestClient")
    RestClient productRestClient(
            @Value("${services.product.base-url:http://localhost:8080}") String url) {
        return RestClient.builder()
            .baseUrl(url)
            .requestFactory(ClientHttpRequestFactories.get(TIMEOUT_SETTINGS))
            .build();
    }

    @Bean("orderRestClient")
    RestClient orderRestClient(
            @Value("${services.order.base-url:http://localhost:8080}") String url) {
        return RestClient.builder()
            .baseUrl(url)
            .requestFactory(ClientHttpRequestFactories.get(TIMEOUT_SETTINGS))
            .build();
    }
}
