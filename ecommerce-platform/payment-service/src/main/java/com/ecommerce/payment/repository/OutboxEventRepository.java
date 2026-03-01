package com.ecommerce.payment.repository;

import com.ecommerce.payment.domain.OutboxEvent;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OutboxEventRepository extends JpaRepository<OutboxEvent, Long> {
    List<OutboxEvent> findTop100ByOrderByCreatedAtAsc();
}
