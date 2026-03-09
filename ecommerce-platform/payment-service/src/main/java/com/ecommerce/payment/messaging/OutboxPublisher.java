package com.ecommerce.payment.messaging;

import com.ecommerce.payment.domain.OutboxEvent;
import com.ecommerce.payment.repository.OutboxEventRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.springframework.amqp.core.AmqpAdmin;
import org.springframework.amqp.core.DirectExchange;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class OutboxPublisher {

    private static final Logger log = LoggerFactory.getLogger(OutboxPublisher.class);

    private final OutboxEventRepository outboxRepository;
    private final AmqpAdmin amqpAdmin;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    public OutboxPublisher(OutboxEventRepository outboxRepository,
                           AmqpAdmin amqpAdmin,
                           RabbitTemplate rabbitTemplate,
                           ObjectMapper objectMapper) {
        this.outboxRepository = outboxRepository;
        this.amqpAdmin = amqpAdmin;
        this.rabbitTemplate = rabbitTemplate;
        this.objectMapper = objectMapper;
    }

    @Scheduled(fixedDelay = 2000)
    public void publishPendingEvents() {
        List<OutboxEvent> pending = outboxRepository.findTop100ByOrderByCreatedAtAsc();
        for (OutboxEvent event : pending) {
            try {
                amqpAdmin.declareExchange(new DirectExchange(event.getExchange(), true, false));
                Map<String, Object> payload = objectMapper.readValue(
                    event.getPayload(), new TypeReference<>() {});
                rabbitTemplate.convertAndSend(event.getExchange(), event.getRoutingKey(), payload);
                outboxRepository.deleteById(event.getId());
            } catch (Exception e) {
                log.warn("Failed to publish outbox event id={}: {}", event.getId(), e.getMessage());
            }
        }
    }
}
