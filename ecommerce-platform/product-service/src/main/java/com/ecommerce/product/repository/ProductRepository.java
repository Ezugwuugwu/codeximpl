package com.ecommerce.product.repository;

import com.ecommerce.product.domain.Product;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByActiveTrue();

    Page<Product> findByActiveTrue(Pageable pageable);

    boolean existsByNameIgnoreCase(String name);

    @Query("""
        select p from Product p
        where p.active = true and (
            lower(p.name) like lower(concat('%', :term, '%'))
            or lower(p.category) like lower(concat('%', :term, '%'))
            or lower(p.description) like lower(concat('%', :term, '%'))
        )
    """)
    List<Product> searchActive(@Param("term") String term);

    List<Product> findTop10ByActiveTrueAndStockGreaterThanOrderByUpdatedAtDesc(Integer stock);
}
