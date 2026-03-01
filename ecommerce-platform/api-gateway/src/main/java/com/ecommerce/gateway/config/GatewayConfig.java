package com.ecommerce.gateway.config;

import java.security.Principal;
import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import reactor.core.publisher.Mono;

@Configuration
public class GatewayConfig {

    @Bean
    public KeyResolver userOrIpKeyResolver() {
        return exchange -> exchange.getPrincipal()
            .map(Principal::getName)
            .switchIfEmpty(Mono.fromSupplier(() -> {
                var remoteAddress = exchange.getRequest().getRemoteAddress();
                if (remoteAddress != null && remoteAddress.getAddress() != null) {
                    return remoteAddress.getAddress().getHostAddress();
                }
                return "anonymous";
            }));
    }
}
