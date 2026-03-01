package com.ecommerce.admin.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "live_sessions")
public class LiveSession {

    @Id
    @Column(name = "session_id", nullable = false, updatable = false)
    private String sessionId = UUID.randomUUID().toString();

    @Column(name = "ticket_id", nullable = false)
    private String ticketId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String email;

    @Column(columnDefinition = "TEXT")
    private String issue;

    @Column(name = "order_id")
    private String orderId;

    @Column(name = "preferred_contact")
    private String preferredContact = "email";

    /** QUEUED | IN_PROGRESS | ENDED | TIMED_OUT */
    @Column(nullable = false)
    private String status = "QUEUED";

    @Column(name = "assigned_agent_name")
    private String assignedAgentName;

    @Column(name = "assigned_queue")
    private String assignedQueue = "General";

    @Column(name = "estimated_wait_minutes")
    private int estimatedWaitMinutes = 5;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "last_activity_at")
    private Instant lastActivityAt = Instant.now();

    @Column(name = "ended_at")
    private Instant endedAt;

    @Column(name = "ended_by")
    private String endedBy;

    // Getters and setters

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public String getTicketId() { return ticketId; }
    public void setTicketId(String ticketId) { this.ticketId = ticketId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getIssue() { return issue; }
    public void setIssue(String issue) { this.issue = issue; }

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }

    public String getPreferredContact() { return preferredContact; }
    public void setPreferredContact(String preferredContact) { this.preferredContact = preferredContact; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getAssignedAgentName() { return assignedAgentName; }
    public void setAssignedAgentName(String assignedAgentName) { this.assignedAgentName = assignedAgentName; }

    public String getAssignedQueue() { return assignedQueue; }
    public void setAssignedQueue(String assignedQueue) { this.assignedQueue = assignedQueue; }

    public int getEstimatedWaitMinutes() { return estimatedWaitMinutes; }
    public void setEstimatedWaitMinutes(int estimatedWaitMinutes) { this.estimatedWaitMinutes = estimatedWaitMinutes; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getLastActivityAt() { return lastActivityAt; }
    public void setLastActivityAt(Instant lastActivityAt) { this.lastActivityAt = lastActivityAt; }

    public Instant getEndedAt() { return endedAt; }
    public void setEndedAt(Instant endedAt) { this.endedAt = endedAt; }

    public String getEndedBy() { return endedBy; }
    public void setEndedBy(String endedBy) { this.endedBy = endedBy; }
}
