package com.ecommerce.admin.service;

import com.ecommerce.admin.controller.dto.SupportMessageReceipt;
import com.ecommerce.admin.controller.dto.SupportMessageRequest;
import com.ecommerce.admin.controller.dto.SupportMessageSummary;
import com.ecommerce.admin.domain.SupportMessage;
import com.ecommerce.admin.repository.SupportMessageRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class SupportMessageService {

    private static final DateTimeFormatter EMAIL_TIME_FORMATTER =
        DateTimeFormatter.ofPattern("MMM d, uuuu 'at' HH:mm 'UTC'", Locale.US).withZone(ZoneOffset.UTC);

    private final SupportMessageRepository supportMessageRepository;
    private final NotificationClient notificationClient;
    private final String supportRecipient;

    public SupportMessageService(SupportMessageRepository supportMessageRepository,
                                 NotificationClient notificationClient,
                                 @Value("${app.support.inbox-address:support@okangamart.com}") String supportRecipient) {
        this.supportMessageRepository = supportMessageRepository;
        this.notificationClient = notificationClient;
        this.supportRecipient = supportRecipient;
    }

    @Transactional
    public SupportMessageReceipt createMessage(SupportMessageRequest request) {
        SupportMessage supportMessage = new SupportMessage();
        supportMessage.setReference(createReference());
        supportMessage.setName(request.name().trim());
        supportMessage.setEmail(request.email().trim().toLowerCase(Locale.ROOT));
        supportMessage.setSubject(request.subject().trim());
        supportMessage.setMessage(request.message().trim());

        SupportMessage saved = supportMessageRepository.save(supportMessage);

        notificationClient.sendSupportMessageAlert(
            supportRecipient,
            "New support message: " + saved.getSubject(),
            buildEmailBody(saved)
        );

        return new SupportMessageReceipt(saved.getReference(), saved.getStatus(), saved.getCreatedAt());
    }

    @Transactional(readOnly = true)
    public List<SupportMessageSummary> listMessages() {
        return supportMessageRepository.findAllByOrderByCreatedAtDesc().stream()
            .map(message -> new SupportMessageSummary(
                message.getReference(),
                message.getName(),
                message.getEmail(),
                message.getSubject(),
                message.getMessage(),
                message.getStatus(),
                message.getCreatedAt()
            ))
            .toList();
    }

    private static String createReference() {
        long suffix = ThreadLocalRandom.current().nextLong(10000000L, 99999999L);
        return "MSG-" + suffix;
    }

    private static String buildEmailBody(SupportMessage supportMessage) {
        return """
            A new support message was submitted on Okanga Mart.

            Reference: %s
            Name: %s
            Email: %s
            Subject: %s
            Received: %s

            Message:
            %s
            """.formatted(
            supportMessage.getReference(),
            supportMessage.getName(),
            supportMessage.getEmail(),
            supportMessage.getSubject(),
            EMAIL_TIME_FORMATTER.format(supportMessage.getCreatedAt()),
            supportMessage.getMessage()
        );
    }
}
