package com.ecommerce.user.service;

import com.ecommerce.user.domain.OtpVerification;
import com.ecommerce.user.repository.AppUserRepository;
import com.ecommerce.user.repository.OtpVerificationRepository;
import java.security.SecureRandom;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
    private final AsyncEmailSender asyncEmailSender;

    public OtpService(OtpVerificationRepository otpRepository,
                      AppUserRepository userRepository,
                      AsyncEmailSender asyncEmailSender) {
        this.otpRepository = otpRepository;
        this.userRepository = userRepository;
        this.asyncEmailSender = asyncEmailSender;
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

        asyncEmailSender.sendOtpEmail(email, code, OTP_EXPIRY_MINUTES);
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


}
