package com.ecommerce.product.service;

import com.ecommerce.product.domain.Product;
import com.ecommerce.product.repository.ProductRepository;
import com.ecommerce.product.service.dto.ProductRequest;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service
public class ProductCatalogService {

    private final ProductRepository repository;
    private final SimpMessagingTemplate messagingTemplate;

    public ProductCatalogService(ProductRepository repository, SimpMessagingTemplate messagingTemplate) {
        this.repository = repository;
        this.messagingTemplate = messagingTemplate;
    }

    public List<Product> listActiveProducts() {
        return repository.findByActiveTrue();
    }

    public Product getById(Long id) {
        return repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
    }

    public List<Product> search(String term) {
        if (term == null || term.isBlank()) {
            return listActiveProducts();
        }
        return repository.searchActive(term.trim());
    }

    @Transactional
    public Product createProduct(ProductRequest request) {
        Product product = new Product();
        applyProductDetails(product, request);
        return repository.save(product);
    }

    @Transactional
    public Product updateInventory(Long id, Integer newStock) {
        Product product = getById(id);
        product.setStock(newStock);
        product.setUpdatedAt(Instant.now());
        Product saved = repository.save(product);

        messagingTemplate.convertAndSend("/topic/inventory", Map.of(
            "productId", saved.getId(),
            "stock", saved.getStock(),
            "updatedAt", saved.getUpdatedAt().toString()));

        return saved;
    }

    @Transactional
    public Product updateProduct(Long id, ProductRequest request) {
        Product product = getById(id);
        applyProductDetails(product, request);
        return repository.save(product);
    }

    @Transactional
    public void deleteProduct(Long id) {
        Product product = getById(id);
        product.setActive(false);
        product.setUpdatedAt(Instant.now());
        repository.save(product);
    }

    public List<Product> recommendations(Long userId) {
        return repository.findTop10ByActiveTrueAndStockGreaterThanOrderByUpdatedAtDesc(0);
    }

    private void applyProductDetails(Product product, ProductRequest request) {
        product.setName(request.name());
        product.setDescription(request.description());
        product.setPrice(request.price());
        product.setStock(request.stock());
        product.setCategory(request.category());
        if (request.imageUrls() == null || request.imageUrls().isEmpty()) {
            String slug = request.name().toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
            product.setImageUrls(List.of(
                "https://picsum.photos/seed/" + slug + "-1/1000/700",
                "https://picsum.photos/seed/" + slug + "-2/1000/700",
                "https://picsum.photos/seed/" + slug + "-3/1000/700"));
        } else {
            product.setImageUrls(request.imageUrls());
        }
        product.setUpdatedAt(Instant.now());
    }
}
