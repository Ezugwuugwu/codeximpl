package com.ecommerce.cart.controller;

import com.ecommerce.cart.domain.Cart;
import com.ecommerce.cart.service.CartManagementService;
import com.ecommerce.cart.service.dto.AddCartItemRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
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

    @GetMapping
    public ResponseEntity<Cart> getCart(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(service.getCart(jwt.getSubject()));
    }

    @PostMapping("/items")
    public ResponseEntity<Cart> addItem(@AuthenticationPrincipal Jwt jwt,
                                        @Valid @RequestBody AddCartItemRequest request) {
        return ResponseEntity.ok(service.addItem(jwt.getSubject(), request));
    }

    @DeleteMapping("/items/{productId}")
    public ResponseEntity<Cart> removeItem(@AuthenticationPrincipal Jwt jwt,
                                           @PathVariable("productId") Long productId) {
        return ResponseEntity.ok(service.removeItem(jwt.getSubject(), productId));
    }

    @DeleteMapping
    public ResponseEntity<Void> clear(@AuthenticationPrincipal Jwt jwt) {
        service.clearCart(jwt.getSubject());
        return ResponseEntity.noContent().build();
    }
}
