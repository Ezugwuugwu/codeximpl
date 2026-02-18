package com.ecommerce.order.controller;

import com.ecommerce.order.domain.CustomerOrder;
import com.ecommerce.order.domain.OrderStatus;
import com.ecommerce.order.service.OrderProcessingService;
import com.ecommerce.order.service.dto.CreateOrderRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
    public ResponseEntity<CustomerOrder> create(@Valid @RequestBody CreateOrderRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createOrder(request));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<CustomerOrder>> listAll() {
        return ResponseEntity.ok(service.listAllOrders());
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<CustomerOrder> getById(@PathVariable String orderId) {
        return ResponseEntity.ok(service.getById(orderId));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<CustomerOrder>> getByUser(@PathVariable String userId) {
        return ResponseEntity.ok(service.getByUser(userId));
    }

    @PatchMapping("/{orderId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CustomerOrder> updateStatus(@PathVariable String orderId,
                                                      @RequestParam OrderStatus status) {
        return ResponseEntity.ok(service.updateStatus(orderId, status));
    }
}
