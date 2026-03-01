package com.ecommerce.order.repository;

import com.ecommerce.order.domain.CustomerOrder;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerOrderRepository extends JpaRepository<CustomerOrder, String> {
    List<CustomerOrder> findByUserIdOrderByCreatedAtDesc(String userId);

    List<CustomerOrder> findAllByOrderByCreatedAtDesc();

    Page<CustomerOrder> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
