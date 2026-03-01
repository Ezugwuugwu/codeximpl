package com.ecommerce.cart.service;

import com.ecommerce.cart.domain.Cart;
import com.ecommerce.cart.service.dto.AddCartItemRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CartManagementServiceTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOps;

    // Use a real ObjectMapper so Cart serialisation/deserialisation works correctly
    private final ObjectMapper objectMapper = new ObjectMapper();

    private CartManagementService service;

    @BeforeEach
    void setUp() {
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        service = new CartManagementService(redisTemplate, objectMapper);
    }

    @Test
    void getCart_noExistingKey_returnsEmptyCartForUser() {
        when(valueOps.get("cart:user1")).thenReturn(null);

        Cart cart = service.getCart("user1");

        assertThat(cart.getUserId()).isEqualTo("user1");
        assertThat(cart.getItems()).isEmpty();
    }

    @Test
    void getCart_existingKey_deserializesCart() throws Exception {
        Cart stored = new Cart();
        stored.setUserId("user1");
        when(valueOps.get("cart:user1")).thenReturn(objectMapper.writeValueAsString(stored));

        Cart cart = service.getCart("user1");

        assertThat(cart.getUserId()).isEqualTo("user1");
    }

    @Test
    void addItem_newProduct_addsItemToCart() {
        when(valueOps.get("cart:user1")).thenReturn(null);

        Cart result = service.addItem("user1",
            new AddCartItemRequest(10L, "Widget", 2, BigDecimal.valueOf(5.00)));

        assertThat(result.getItems()).hasSize(1);
        assertThat(result.getItems().get(0).getProductId()).isEqualTo(10L);
        assertThat(result.getItems().get(0).getQuantity()).isEqualTo(2);
        verify(valueOps).set(eq("cart:user1"), anyString());
    }

    @Test
    void addItem_existingProduct_incrementsQuantity() throws Exception {
        Cart existing = new Cart();
        existing.setUserId("user1");
        AddCartItemRequest firstAdd = new AddCartItemRequest(10L, "Widget", 2, BigDecimal.valueOf(5.00));
        // Manually build a cart with one item already in Redis
        service.addItem("user1", firstAdd);
        // Capture the serialised cart after first add
        when(valueOps.get("cart:user1")).thenReturn(null);
        Cart afterFirst = service.addItem("user1", firstAdd);
        // Now simulate the second add with the stored cart
        when(valueOps.get("cart:user1")).thenReturn(objectMapper.writeValueAsString(afterFirst));

        Cart result = service.addItem("user1",
            new AddCartItemRequest(10L, "Widget", 3, BigDecimal.valueOf(5.00)));

        assertThat(result.getItems()).hasSize(1);
        assertThat(result.getItems().get(0).getQuantity()).isEqualTo(5); // 2 + 3
    }

    @Test
    void removeItem_removesProductFromCart() throws Exception {
        Cart existing = new Cart();
        existing.setUserId("user1");
        service.addItem("user1", new AddCartItemRequest(10L, "Widget", 1, BigDecimal.valueOf(5.00)));
        when(valueOps.get("cart:user1")).thenReturn(null);
        Cart withItem = service.addItem("user1",
            new AddCartItemRequest(10L, "Widget", 1, BigDecimal.valueOf(5.00)));
        when(valueOps.get("cart:user1")).thenReturn(objectMapper.writeValueAsString(withItem));

        Cart result = service.removeItem("user1", 10L);

        assertThat(result.getItems()).isEmpty();
    }

    @Test
    void clearCart_deletesRedisKey() {
        service.clearCart("user1");

        verify(redisTemplate).delete("cart:user1");
    }
}
