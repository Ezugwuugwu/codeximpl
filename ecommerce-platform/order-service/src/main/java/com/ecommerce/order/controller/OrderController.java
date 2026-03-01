package com.ecommerce.order.controller;

import com.ecommerce.order.domain.CustomerOrder;
import com.ecommerce.order.domain.OrderStatus;
import com.ecommerce.order.service.OrderProcessingService;
import com.ecommerce.order.service.dto.CreateOrderRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderProcessingService service;

    public OrderController(OrderProcessingService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<CustomerOrder> create(@AuthenticationPrincipal Jwt jwt,
                                                @Valid @RequestBody CreateOrderRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createOrder(jwt.getSubject(), request));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<CustomerOrder>> listAll(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "25") int size) {
        var pageable = PageRequest.of(page, Math.min(size, 200), Sort.by("createdAt").descending());
        return ResponseEntity.ok(service.listAllOrders(pageable));
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<CustomerOrder> getById(@PathVariable String orderId) {
        return ResponseEntity.ok(service.getById(orderId));
    }

    @GetMapping("/my")
    public ResponseEntity<List<CustomerOrder>> getByUser(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(service.getByUser(jwt.getSubject()));
    }

    @PatchMapping("/{orderId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CustomerOrder> updateStatus(@PathVariable String orderId,
                                                      @RequestParam(name = "status") OrderStatus status) {
        return ResponseEntity.ok(service.updateStatus(orderId, status));
    }
}
