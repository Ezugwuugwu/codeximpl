package com.ecommerce.admin.controller;

import com.ecommerce.admin.controller.dto.SupportMessageReceipt;
import com.ecommerce.admin.controller.dto.SupportMessageRequest;
import com.ecommerce.admin.controller.dto.SupportMessageSummary;
import com.ecommerce.admin.domain.LiveMessage;
import com.ecommerce.admin.domain.LiveSession;
import com.ecommerce.admin.repository.LiveMessageRepository;
import com.ecommerce.admin.repository.LiveSessionRepository;
import com.ecommerce.admin.service.SupportMessageService;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/support")
public class SupportController {

    private static final long IDLE_TIMEOUT_MINUTES = 30;

    private final LiveSessionRepository sessionRepo;
    private final LiveMessageRepository messageRepo;
    private final SupportMessageService supportMessageService;

    public SupportController(LiveSessionRepository sessionRepo,
                             LiveMessageRepository messageRepo,
                             SupportMessageService supportMessageService) {
        this.sessionRepo = sessionRepo;
        this.messageRepo = messageRepo;
        this.supportMessageService = supportMessageService;
    }

    @PostMapping("/messages")
    public ResponseEntity<SupportMessageReceipt> createSupportMessage(
        @Valid @RequestBody SupportMessageRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(supportMessageService.createMessage(request));
    }

    @GetMapping("/messages")
    @PreAuthorize("hasRole('ADMIN')")
    public List<SupportMessageSummary> listSupportMessages() {
        return supportMessageService.listMessages();
    }

    @PostMapping("/sessions")
    @Transactional
    public ResponseEntity<LiveSession> createSession(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        String email = body.get("email");
        String issue = body.get("issue");

        if (name == null || name.isBlank() || email == null || email.isBlank()
            || issue == null || issue.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        LiveSession session = new LiveSession();
        session.setTicketId("TKT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        session.setName(name.trim());
        session.setEmail(email.trim());
        session.setIssue(issue.trim());

        String orderId = body.get("orderId");
        if (orderId != null && !orderId.isBlank()) {
            session.setOrderId(orderId.trim());
        }

        String preferredContact = body.get("preferredContact");
        session.setPreferredContact("phone".equals(preferredContact) ? "phone" : "email");
        session.setStatus("QUEUED");
        session.setAssignedQueue("General");
        session.setEstimatedWaitMinutes(5);

        LiveSession saved = sessionRepo.save(session);

        LiveMessage firstMessage = new LiveMessage();
        firstMessage.setSessionId(saved.getSessionId());
        firstMessage.setAuthor("customer");
        firstMessage.setSenderName(saved.getName());
        firstMessage.setText(saved.getIssue());
        messageRepo.save(firstMessage);

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping("/sessions")
    @Transactional
    public List<LiveSession> listSessions() {
        autoCloseSessions();
        return sessionRepo.findAllByOrderByCreatedAtDesc();
    }

    @GetMapping("/sessions/{sessionId}")
    public ResponseEntity<LiveSession> getSession(@PathVariable String sessionId) {
        LiveSession session = sessionRepo.findById(sessionId).orElse(null);
        if (session == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(session);
    }

    @GetMapping("/sessions/{sessionId}/messages")
    public ResponseEntity<List<LiveMessage>> listMessages(@PathVariable String sessionId) {
        if (!sessionRepo.existsById(sessionId)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(messageRepo.findBySessionIdOrderByCreatedAtAsc(sessionId));
    }

    @PostMapping("/sessions/{sessionId}/messages")
    @Transactional
    public ResponseEntity<LiveMessage> sendMessage(@PathVariable String sessionId,
                                                   @RequestBody Map<String, String> body) {
        LiveSession session = sessionRepo.findById(sessionId).orElse(null);
        if (session == null) {
            return ResponseEntity.notFound().build();
        }

        if (!"QUEUED".equals(session.getStatus()) && !"IN_PROGRESS".equals(session.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        String text = body.get("text");
        if (text == null || text.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        String author = body.getOrDefault("author", "customer");

        LiveMessage message = new LiveMessage();
        message.setSessionId(sessionId);
        message.setAuthor(author);
        message.setText(text.trim());

        if ("customer".equals(author)) {
            message.setSenderName(session.getName());
        } else if ("agent".equals(author)) {
            String senderName = body.get("senderName");
            message.setSenderName(senderName != null ? senderName : session.getAssignedAgentName());
        }

        LiveMessage saved = messageRepo.save(message);

        session.setLastActivityAt(Instant.now());
        sessionRepo.save(session);

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PostMapping("/sessions/{sessionId}/join")
    @Transactional
    public ResponseEntity<LiveSession> joinSession(@PathVariable String sessionId,
                                                   @RequestBody Map<String, String> body) {
        LiveSession session = sessionRepo.findById(sessionId).orElse(null);
        if (session == null) {
            return ResponseEntity.notFound().build();
        }

        if (!"QUEUED".equals(session.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        String agentName = body.getOrDefault("agentName", "Support Agent");
        session.setAssignedAgentName(agentName);
        session.setStatus("IN_PROGRESS");
        session.setLastActivityAt(Instant.now());
        LiveSession saved = sessionRepo.save(session);

        addSystemMessage(sessionId, agentName + " has joined the chat.");

        return ResponseEntity.ok(saved);
    }

    @PostMapping("/sessions/{sessionId}/end")
    @Transactional
    public ResponseEntity<Void> endSession(@PathVariable String sessionId,
                                           @RequestBody Map<String, String> body) {
        LiveSession session = sessionRepo.findById(sessionId).orElse(null);
        if (session == null) {
            return ResponseEntity.notFound().build();
        }

        if ("ENDED".equals(session.getStatus()) || "TIMED_OUT".equals(session.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        messageRepo.deleteBySessionId(sessionId);
        sessionRepo.delete(session);

        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/sessions")
    @Transactional
    public ResponseEntity<Void> clearAllSessions() {
        messageRepo.deleteAll();
        sessionRepo.deleteAll();
        return ResponseEntity.noContent().build();
    }

    private void addSystemMessage(String sessionId, String text) {
        LiveMessage message = new LiveMessage();
        message.setSessionId(sessionId);
        message.setAuthor("system");
        message.setSenderName("System");
        message.setText(text);
        messageRepo.save(message);
    }

    private void autoCloseSessions() {
        Instant cutoff = Instant.now().minusSeconds(IDLE_TIMEOUT_MINUTES * 60);
        List<LiveSession> idleSessions = sessionRepo.findIdleSessions(cutoff);
        for (LiveSession session : idleSessions) {
            messageRepo.deleteBySessionId(session.getSessionId());
            sessionRepo.delete(session);
        }
    }
}
