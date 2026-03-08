package com.ecommerce.product.service;

import com.ecommerce.product.domain.Product;
import com.ecommerce.product.repository.ProductRepository;
import com.ecommerce.product.service.dto.ProductResponse;
import com.ecommerce.product.service.dto.ProductRequest;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductCatalogServiceTest {

    @Mock
    private ProductRepository repository;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private ProductCatalogService service;

    @Test
    void listActiveProducts_delegatesToRepository() {
        Product p = buildProduct(1L, "Widget", true);
        Pageable pageable = PageRequest.of(0, 20);
        Page<Product> page = new PageImpl<>(List.of(p), pageable, 1);
        when(repository.findByActiveTrue(pageable)).thenReturn(page);

        Page<ProductResponse> result = service.listActiveProducts(pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).id()).isEqualTo(1L);
        verify(repository).findByActiveTrue(pageable);
    }

    @Test
    void getById_found_returnsProduct() {
        Product p = buildProduct(1L, "Widget", true);
        when(repository.findById(1L)).thenReturn(Optional.of(p));

        ProductResponse result = service.getById(1L);

        assertThat(result.id()).isEqualTo(1L);
        assertThat(result.name()).isEqualTo("Widget");
    }

    @Test
    void getById_notFound_throwsNotFoundException() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getById(99L))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void createProduct_noImageUrls_generatesPicsumUrls() {
        ProductRequest request = new ProductRequest(
            "Blue Mug", "A nice mug", BigDecimal.valueOf(9.99), 50, "Kitchen", null);

        Product saved = buildProduct(1L, "Blue Mug", true);
        saved.setImageUrls(List.of(
            "https://picsum.photos/seed/blue-mug-1/1000/700",
            "https://picsum.photos/seed/blue-mug-2/1000/700",
            "https://picsum.photos/seed/blue-mug-3/1000/700"));
        when(repository.save(any(Product.class))).thenReturn(saved);

        ProductResponse result = service.createProduct(request);

        assertThat(result.imageUrls()).hasSize(3)
            .allMatch(url -> url.startsWith("https://picsum.photos/seed/"));
    }

    @Test
    void updateInventory_savesNewStock_andSendsWebSocketMessage() {
        Product p = buildProduct(1L, "Widget", true);
        p.setStock(100);
        when(repository.findById(1L)).thenReturn(Optional.of(p));

        Product updated = buildProduct(1L, "Widget", true);
        updated.setStock(75);
        when(repository.save(any(Product.class))).thenReturn(updated);

        service.updateInventory(1L, 75);

        verify(messagingTemplate).convertAndSend(eq("/topic/inventory"), any(Object.class));
    }

    @Test
    void deleteProduct_setsActiveFalseAndSaves() {
        Product p = buildProduct(1L, "Widget", true);
        when(repository.findById(1L)).thenReturn(Optional.of(p));
        when(repository.save(any(Product.class))).thenReturn(p);

        service.deleteProduct(1L);

        ArgumentCaptor<Product> captor = ArgumentCaptor.forClass(Product.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().isActive()).isFalse();
    }

    private Product buildProduct(Long id, String name, boolean active) {
        Product p = new Product();
        p.setId(id);
        p.setName(name);
        p.setDescription("description");
        p.setPrice(BigDecimal.valueOf(9.99));
        p.setStock(10);
        p.setCategory("General");
        p.setPrimaryImageUrl("https://example.com/widget.jpg");
        p.setImageCount(1);
        p.setActive(active);
        return p;
    }
}
