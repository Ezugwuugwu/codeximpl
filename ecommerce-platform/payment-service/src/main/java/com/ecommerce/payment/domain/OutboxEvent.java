package com.ecommerce.payment.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "outbox_events")
public class OutboxEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String exchange;

    @Column(name = "routing_key", nullable = false)
    private String routingKey;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String payload;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    public OutboxEvent() {}

    public OutboxEvent(String exchange, String routingKey, String payload) {
        this.exchange = exchange;
        this.routingKey = routingKey;
        this.payload = payload;
    }

    public Long getId() { return id; }
    public String getExchange() { return exchange; }
    public String getRoutingKey() { return routingKey; }
    public String getPayload() { return payload; }
    public Instant getCreatedAt() { return createdAt; }
}
