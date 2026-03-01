package com.ecommerce.order.repository;

import com.ecommerce.order.domain.OutboxEvent;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OutboxEventRepository extends JpaRepository<OutboxEvent, Long> {
    List<OutboxEvent> findTop100ByOrderByCreatedAtAsc();
}
