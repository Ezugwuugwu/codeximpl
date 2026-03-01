package com.ecommerce.admin.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "live_messages")
public class LiveMessage {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private String id = UUID.randomUUID().toString();

    @Column(name = "session_id", nullable = false)
    private String sessionId;

    /** customer | agent | system */
    @Column(nullable = false)
    private String author;

    /** Display name of the sender (customer name, agent name, or null for system) */
    @Column(name = "sender_name")
    private String senderName;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String text;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    // Getters and setters

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }

    public String getSenderName() { return senderName; }
    public void setSenderName(String senderName) { this.senderName = senderName; }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
