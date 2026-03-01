package com.ecommerce.admin.repository;

import com.ecommerce.admin.domain.LiveSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface LiveSessionRepository extends JpaRepository<LiveSession, String> {

    List<LiveSession> findAllByOrderByCreatedAtDesc();

    @Query("SELECT s FROM LiveSession s WHERE s.status IN ('QUEUED', 'IN_PROGRESS') AND s.lastActivityAt < :cutoff")
    List<LiveSession> findIdleSessions(@Param("cutoff") Instant cutoff);
}
