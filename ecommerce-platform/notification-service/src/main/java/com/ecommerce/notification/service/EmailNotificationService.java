package com.ecommerce.notification.service;

import com.ecommerce.notification.model.NotificationMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailNotificationService {

    private static final Logger LOGGER = LoggerFactory.getLogger(EmailNotificationService.class);

    private final JavaMailSender mailSender;
    private final String fromAddress;
    private final String fromName;

    public EmailNotificationService(JavaMailSender mailSender,
                                    @Value("${app.mail.from-address:}") String fromAddress,
                                    @Value("${app.mail.from-name:Okanga Mart}") String fromName,
                                    @Value("${spring.mail.username:}") String smtpUsername) {
        this.mailSender = mailSender;
        this.fromAddress = resolveFromAddress(fromAddress, smtpUsername);
        this.fromName = fromName == null ? "Okanga Mart" : fromName.trim();
    }

    public void send(NotificationMessage message) {
        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setFrom(formatFromHeader());
            mail.setTo(message.recipient());
            mail.setSubject(message.subject());
            mail.setText(message.body());
            mailSender.send(mail);
            LOGGER.info("Email notification sent to {}", message.recipient());
        } catch (Exception exception) {
            LOGGER.warn("Email send skipped or failed, message logged instead: {}", message);
        }
    }

    private static String resolveFromAddress(String configuredFromAddress, String smtpUsername) {
        if (configuredFromAddress != null && !configuredFromAddress.isBlank()) {
            return configuredFromAddress.trim();
        }
        if (smtpUsername != null && !smtpUsername.isBlank()) {
            return smtpUsername.trim();
        }
        return "support@okangamart.com";
    }

    private String formatFromHeader() {
        if (fromName.isBlank()) {
            return fromAddress;
        }
        return "%s <%s>".formatted(fromName, fromAddress);
    }
}
