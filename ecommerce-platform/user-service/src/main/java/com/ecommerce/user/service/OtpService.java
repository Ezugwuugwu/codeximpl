package com.ecommerce.user.service;

import com.ecommerce.user.domain.OtpVerification;
import com.ecommerce.user.repository.AppUserRepository;
import com.ecommerce.user.repository.OtpVerificationRepository;
import java.security.SecureRandom;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class OtpService {

    private static final Logger log = LoggerFactory.getLogger(OtpService.class);
    private static final int OTP_EXPIRY_MINUTES = 10;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final OtpVerificationRepository otpRepository;
    private final AppUserRepository userRepository;
    private final JavaMailSender mailSender;

    public OtpService(OtpVerificationRepository otpRepository,
                      AppUserRepository userRepository,
                      JavaMailSender mailSender) {
        this.otpRepository = otpRepository;
        this.userRepository = userRepository;
        this.mailSender = mailSender;
    }

    @Transactional
    public void generateAndSend(String email) {
        otpRepository.deleteAllByEmail(email);

        String code = String.format("%06d", RANDOM.nextInt(1_000_000));

        OtpVerification otp = new OtpVerification();
        otp.setEmail(email);
        otp.setOtp(code);
        otp.setExpiresAt(Instant.now().plusSeconds(OTP_EXPIRY_MINUTES * 60L));
        otpRepository.save(otp);

        sendOtpEmail(email, code);
    }

    @Transactional
    public void verify(String email, String code) {
        OtpVerification otp = otpRepository.findTopByEmailOrderByCreatedAtDesc(email)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "No verification code found for this email."));

        if (otp.isUsed()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This verification code has already been used.");
        }
        if (Instant.now().isAfter(otp.getExpiresAt())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Verification code has expired. Please request a new one.");
        }
        if (!otp.getOtp().equals(code)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid verification code.");
        }

        otp.setUsed(true);
        otpRepository.save(otp);

        userRepository.findByEmail(email).ifPresent(user -> {
            user.setEnabled(true);
            userRepository.save(user);
        });
    }

    private void sendOtpEmail(String email, String code) {
        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setTo(email);
            mail.setSubject("Your Okanga Mart verification code");
            mail.setText(
                "Welcome to Okanga Mart!\n\n" +
                "Your verification code is: " + code + "\n\n" +
                "This code expires in " + OTP_EXPIRY_MINUTES + " minutes.\n\n" +
                "If you did not register, you can safely ignore this email."
            );
            mailSender.send(mail);
            log.info("OTP email sent to {}", email);
        } catch (Exception e) {
            log.warn("Failed to send OTP email to {}: {}", email, e.getMessage());
        }
    }
}
