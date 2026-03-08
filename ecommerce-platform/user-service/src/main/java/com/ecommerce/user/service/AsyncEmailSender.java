package com.ecommerce.user.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class AsyncEmailSender {

    private static final Logger log = LoggerFactory.getLogger(AsyncEmailSender.class);

    private final JavaMailSender mailSender;
    private final String fromAddress;
    private final String fromName;

    public AsyncEmailSender(JavaMailSender mailSender,
                            @Value("${app.mail.from-address:}") String fromAddress,
                            @Value("${app.mail.from-name:Okanga Mart}") String fromName,
                            @Value("${spring.mail.username:}") String smtpUsername) {
        this.mailSender = mailSender;
        this.fromAddress = resolveFromAddress(fromAddress, smtpUsername);
        this.fromName = fromName == null ? "Okanga Mart" : fromName.trim();
    }

    public void sendOtpEmail(String email, String code, int expiryMinutes) {
        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setFrom(formatFromHeader());
            mail.setTo(email);
            mail.setSubject("Your Okanga Mart verification code");
            mail.setText(
                "Welcome to Okanga Mart!\n\n" +
                "Your verification code is: " + code + "\n\n" +
                "This code expires in " + expiryMinutes + " minutes.\n\n" +
                "If you did not register, you can safely ignore this email."
            );
            mailSender.send(mail);
            log.info("OTP email sent to {}", email);
        } catch (Exception e) {
            log.error("Failed to send OTP email to {}: {}", email, e.getMessage(), e);
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Unable to send verification email right now. Please try again shortly."
            );
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
