package com.ecommerce.order.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMqConfig {

    @Bean
    public DirectExchange commerceExchange() {
        return new DirectExchange("commerce.events", true, false);
    }

    @Bean
    public Queue orderEventsQueue() {
        return new Queue("order.events", true);
    }

    @Bean
    public Binding orderBinding(Queue orderEventsQueue, DirectExchange commerceExchange) {
        return BindingBuilder.bind(orderEventsQueue)
            .to(commerceExchange)
            .with("order.created");
    }
}
