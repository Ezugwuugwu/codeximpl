package com.ecommerce.cart.controller;

import com.ecommerce.cart.domain.Cart;
import com.ecommerce.cart.service.CartManagementService;
import com.ecommerce.cart.service.dto.AddCartItemRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/cart")
public class CartController {

    private final CartManagementService service;

    public CartController(CartManagementService service) {
        this.service = service;
    }

    @GetMapping("/{userId}")
    public ResponseEntity<Cart> getCart(@PathVariable("userId") String userId) {
        return ResponseEntity.ok(service.getCart(userId));
    }

    @PostMapping("/{userId}/items")
    public ResponseEntity<Cart> addItem(@PathVariable("userId") String userId,
                                        @Valid @RequestBody AddCartItemRequest request) {
        return ResponseEntity.ok(service.addItem(userId, request));
    }

    @DeleteMapping("/{userId}/items/{productId}")
    public ResponseEntity<Cart> removeItem(@PathVariable("userId") String userId, @PathVariable("productId") Long productId) {
        return ResponseEntity.ok(service.removeItem(userId, productId));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> clear(@PathVariable("userId") String userId) {
        service.clearCart(userId);
        return ResponseEntity.noContent().build();
    }
}
