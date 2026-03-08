package com.ecommerce.notification.service;

import org.junit.jupiter.api.Test;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Properties;

/**
 * Live SMTP smoke test — sends a real email via Brevo.
 * Run manually: mvn -pl notification-service -Dtest=SmtpLiveTest test
 * NOT intended to run in CI (requires real credentials).
 */
class SmtpLiveTest {

    @Test
    void sendTestEmail() {
        String smtpHost     = System.getenv().getOrDefault("SMTP_HOST",     "smtp-relay.brevo.com");
        String smtpUsername = System.getenv().getOrDefault("SMTP_USERNAME", "");
        String smtpPassword = System.getenv().getOrDefault("SMTP_PASSWORD", "");
        String recipient    = System.getenv().getOrDefault("TEST_EMAIL",    smtpUsername);

        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(smtpHost);
        sender.setPort(587);
        sender.setUsername(smtpUsername);
        sender.setPassword(smtpPassword);

        Properties props = sender.getJavaMailProperties();
        props.put("mail.smtp.auth",            "true");
        props.put("mail.smtp.starttls.enable", "true");

        SimpleMailMessage mail = new SimpleMailMessage();
        mail.setFrom("Okanga Mart <noreply@okangamart.com>");
        mail.setTo(recipient);
        mail.setSubject("Okanga Mart — SMTP test");
        mail.setText("If you received this, Brevo SMTP is working correctly.");

        sender.send(mail);
        System.out.println("Test email sent to: " + recipient);
    }
}
