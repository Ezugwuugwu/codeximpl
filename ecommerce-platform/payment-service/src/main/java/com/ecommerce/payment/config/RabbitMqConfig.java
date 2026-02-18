package com.ecommerce.payment.config;

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
    public Queue paymentEventsQueue() {
        return new Queue("payment.events", true);
    }

    @Bean
    public Binding paymentBinding(Queue paymentEventsQueue, DirectExchange commerceExchange) {
        return BindingBuilder.bind(paymentEventsQueue)
            .to(commerceExchange)
            .with("payment.processed");
    }
}
