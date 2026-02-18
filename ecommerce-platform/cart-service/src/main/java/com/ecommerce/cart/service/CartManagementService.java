package com.ecommerce.cart.service;

import com.ecommerce.cart.domain.Cart;
import com.ecommerce.cart.domain.CartItem;
import com.ecommerce.cart.service.dto.AddCartItemRequest;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Optional;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class CartManagementService {

    private static final String KEY_PREFIX = "cart:";

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public CartManagementService(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    public Cart getCart(String userId) {
        String value = redisTemplate.opsForValue().get(KEY_PREFIX + userId);
        if (value == null) {
            Cart cart = new Cart();
            cart.setUserId(userId);
            return cart;
        }

        try {
            return objectMapper.readValue(value, Cart.class);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to parse cart payload", exception);
        }
    }

    public Cart addItem(String userId, AddCartItemRequest request) {
        Cart cart = getCart(userId);
        Optional<CartItem> existing = cart.getItems().stream()
            .filter(item -> item.getProductId().equals(request.productId()))
            .findFirst();

        if (existing.isPresent()) {
            CartItem item = existing.get();
            item.setQuantity(item.getQuantity() + request.quantity());
        } else {
            CartItem item = new CartItem();
            item.setProductId(request.productId());
            item.setProductName(request.productName());
            item.setQuantity(request.quantity());
            item.setUnitPrice(request.unitPrice());
            cart.getItems().add(item);
        }

        persist(userId, cart);
        return cart;
    }

    public Cart removeItem(String userId, Long productId) {
        Cart cart = getCart(userId);
        cart.getItems().removeIf(item -> item.getProductId().equals(productId));
        persist(userId, cart);
        return cart;
    }

    public void clearCart(String userId) {
        redisTemplate.delete(KEY_PREFIX + userId);
    }

    private void persist(String userId, Cart cart) {
        try {
            redisTemplate.opsForValue().set(KEY_PREFIX + userId, objectMapper.writeValueAsString(cart));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to serialize cart", exception);
        }
    }
}
