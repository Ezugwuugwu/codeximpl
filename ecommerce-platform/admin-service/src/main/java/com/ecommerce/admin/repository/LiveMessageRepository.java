package com.ecommerce.admin.repository;

import com.ecommerce.admin.domain.LiveMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LiveMessageRepository extends JpaRepository<LiveMessage, String> {

    List<LiveMessage> findBySessionIdOrderByCreatedAtAsc(String sessionId);

    void deleteBySessionId(String sessionId);
}
