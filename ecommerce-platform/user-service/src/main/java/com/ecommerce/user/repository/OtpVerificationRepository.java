package com.ecommerce.user.repository;

import com.ecommerce.user.domain.OtpVerification;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OtpVerificationRepository extends JpaRepository<OtpVerification, Long> {

    Optional<OtpVerification> findTopByEmailOrderByCreatedAtDesc(String email);

    void deleteAllByEmail(String email);
}
