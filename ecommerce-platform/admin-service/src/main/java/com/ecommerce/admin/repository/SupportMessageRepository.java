package com.ecommerce.admin.repository;

import com.ecommerce.admin.domain.SupportMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SupportMessageRepository extends JpaRepository<SupportMessage, String> {

    List<SupportMessage> findAllByOrderByCreatedAtDesc();
}
