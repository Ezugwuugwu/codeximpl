package com.ecommerce.admin.controller;

import com.ecommerce.admin.domain.LiveMessage;
import com.ecommerce.admin.domain.LiveSession;
import com.ecommerce.admin.repository.LiveMessageRepository;
import com.ecommerce.admin.repository.LiveSessionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/support")
public class SupportController {

    private final LiveSessionRepository sessionRepo;
    private final LiveMessageRepository messageRepo;

    private static final long IDLE_TIMEOUT_MINUTES = 30;

    public SupportController(LiveSessionRepository sessionRepo,
                             LiveMessageRepository messageRepo) {
        this.sessionRepo = sessionRepo;
        this.messageRepo = messageRepo;
    }

    /** POST /api/support/sessions — create a new live-agent session */
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

        String pc = body.get("preferredContact");
        session.setPreferredContact("phone".equals(pc) ? "phone" : "email");
        session.setStatus("QUEUED");
        session.setAssignedQueue("General");
        session.setEstimatedWaitMinutes(5);

        LiveSession saved = sessionRepo.save(session);

        // Store the customer's issue as their first message so both sides see it
        LiveMessage firstMsg = new LiveMessage();
        firstMsg.setSessionId(saved.getSessionId());
        firstMsg.setAuthor("customer");
        firstMsg.setSenderName(saved.getName());
        firstMsg.setText(saved.getIssue());
        messageRepo.save(firstMsg);

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /** GET /api/support/sessions — list all sessions */
    @GetMapping("/sessions")
    @Transactional
    public List<LiveSession> listSessions() {
        autoCloseSessions();
        return sessionRepo.findAllByOrderByCreatedAtDesc();
    }

    /** GET /api/support/sessions/{sessionId} */
    @GetMapping("/sessions/{sessionId}")
    public ResponseEntity<LiveSession> getSession(@PathVariable String sessionId) {
        LiveSession session = sessionRepo.findById(sessionId).orElse(null);
        if (session == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(session);
    }

    /** GET /api/support/sessions/{sessionId}/messages */
    @GetMapping("/sessions/{sessionId}/messages")
    public ResponseEntity<List<LiveMessage>> listMessages(@PathVariable String sessionId) {
        if (!sessionRepo.existsById(sessionId)) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(messageRepo.findBySessionIdOrderByCreatedAtAsc(sessionId));
    }

    /** POST /api/support/sessions/{sessionId}/messages — send a message */
    @PostMapping("/sessions/{sessionId}/messages")
    @Transactional
    public ResponseEntity<LiveMessage> sendMessage(@PathVariable String sessionId,
                                                   @RequestBody Map<String, String> body) {
        LiveSession session = sessionRepo.findById(sessionId).orElse(null);
        if (session == null) return ResponseEntity.notFound().build();

        if (!"QUEUED".equals(session.getStatus()) && !"IN_PROGRESS".equals(session.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        String text = body.get("text");
        if (text == null || text.isBlank()) return ResponseEntity.badRequest().build();

        String author = body.getOrDefault("author", "customer");

        LiveMessage msg = new LiveMessage();
        msg.setSessionId(sessionId);
        msg.setAuthor(author);
        msg.setText(text.trim());

        // Attach sender display name so the UI doesn't need to derive it from session state
        if ("customer".equals(author)) {
            msg.setSenderName(session.getName());
        } else if ("agent".equals(author)) {
            String senderName = body.get("senderName");
            msg.setSenderName(senderName != null ? senderName : session.getAssignedAgentName());
        }

        LiveMessage saved = messageRepo.save(msg);

        session.setLastActivityAt(Instant.now());
        sessionRepo.save(session);

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /** POST /api/support/sessions/{sessionId}/join — agent joins a queued session */
    @PostMapping("/sessions/{sessionId}/join")
    @Transactional
    public ResponseEntity<LiveSession> joinSession(@PathVariable String sessionId,
                                                   @RequestBody Map<String, String> body) {
        LiveSession session = sessionRepo.findById(sessionId).orElse(null);
        if (session == null) return ResponseEntity.notFound().build();

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

    /** POST /api/support/sessions/{sessionId}/end — end and delete a session */
    @PostMapping("/sessions/{sessionId}/end")
    @Transactional
    public ResponseEntity<Void> endSession(@PathVariable String sessionId,
                                           @RequestBody Map<String, String> body) {
        LiveSession session = sessionRepo.findById(sessionId).orElse(null);
        if (session == null) return ResponseEntity.notFound().build();

        if ("ENDED".equals(session.getStatus()) || "TIMED_OUT".equals(session.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        // Delete messages then session — both sides will see the chat disappear on next poll
        messageRepo.deleteBySessionId(sessionId);
        sessionRepo.delete(session);

        return ResponseEntity.noContent().build();
    }

    /** DELETE /api/support/sessions — clear all sessions (admin) */
    @DeleteMapping("/sessions")
    @Transactional
    public ResponseEntity<Void> clearAllSessions() {
        messageRepo.deleteAll();
        sessionRepo.deleteAll();
        return ResponseEntity.noContent().build();
    }

    // ---- helpers ----

    private void addSystemMessage(String sessionId, String text) {
        LiveMessage msg = new LiveMessage();
        msg.setSessionId(sessionId);
        msg.setAuthor("system");
        msg.setSenderName("System");
        msg.setText(text);
        messageRepo.save(msg);
    }

    private void autoCloseSessions() {
        Instant cutoff = Instant.now().minusSeconds(IDLE_TIMEOUT_MINUTES * 60);
        List<LiveSession> idle = sessionRepo.findIdleSessions(cutoff);
        for (LiveSession s : idle) {
            messageRepo.deleteBySessionId(s.getSessionId());
            sessionRepo.delete(s);
        }
    }
}
