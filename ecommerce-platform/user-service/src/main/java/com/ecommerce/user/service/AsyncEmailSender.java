package com.ecommerce.user.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
public class AsyncEmailSender {

    private static final Logger log = LoggerFactory.getLogger(AsyncEmailSender.class);

    private final JavaMailSender mailSender;

    public AsyncEmailSender(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Async
    public void sendOtpEmail(String email, String code, int expiryMinutes) {
        try {
            SimpleMailMessage mail = new SimpleMailMessage();
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
            log.warn("Failed to send OTP email to {}: {}", email, e.getMessage());
        }
    }
}
