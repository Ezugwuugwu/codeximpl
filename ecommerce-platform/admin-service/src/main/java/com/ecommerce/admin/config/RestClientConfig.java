package com.ecommerce.admin.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class RestClientConfig {

    @Bean("productRestClient")
    RestClient productRestClient(
            @Value("${services.product.base-url:http://localhost:8080}") String url) {
        return RestClient.builder().baseUrl(url).build();
    }

    @Bean("orderRestClient")
    RestClient orderRestClient(
            @Value("${services.order.base-url:http://localhost:8080}") String url) {
        return RestClient.builder().baseUrl(url).build();
    }
}
