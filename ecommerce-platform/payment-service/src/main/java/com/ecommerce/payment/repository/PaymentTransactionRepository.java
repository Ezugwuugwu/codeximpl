package com.ecommerce.payment.repository;

import com.ecommerce.payment.domain.PaymentTransaction;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, String> {
    List<PaymentTransaction> findByOrderId(String orderId);
    Optional<PaymentTransaction> findTopByProviderReference(String providerReference);
}
