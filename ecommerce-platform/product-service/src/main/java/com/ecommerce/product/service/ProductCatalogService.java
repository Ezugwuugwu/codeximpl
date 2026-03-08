package com.ecommerce.product.service;

import com.ecommerce.product.domain.Product;
import com.ecommerce.product.repository.ProductRepository;
import com.ecommerce.product.service.dto.ProductResponse;
import com.ecommerce.product.service.dto.ProductRequest;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductCatalogService {

    private final ProductRepository repository;
    private final SimpMessagingTemplate messagingTemplate;

    public ProductCatalogService(ProductRepository repository, SimpMessagingTemplate messagingTemplate) {
        this.repository = repository;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional(readOnly = true)
    public Page<ProductResponse> listActiveProducts(Pageable pageable) {
        return repository.findByActiveTrue(pageable).map(ProductResponse::summary);
    }

    @Transactional(readOnly = true)
    public ProductResponse getById(Long id) {
        return ProductResponse.detail(getEntityById(id));
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> search(String term) {
        if (term == null || term.isBlank()) {
            return repository.findByActiveTrue().stream()
                .map(ProductResponse::summary)
                .toList();
        }
        return repository.searchActive(term.trim()).stream()
            .map(ProductResponse::summary)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> recommendations(Long userId) {
        return repository.findTop10ByActiveTrueAndStockGreaterThanOrderByUpdatedAtDesc(0).stream()
            .map(ProductResponse::summary)
            .toList();
    }

    @Transactional
    public ProductResponse createProduct(ProductRequest request) {
        Product product = new Product();
        applyProductDetails(product, request);
        return ProductResponse.detail(repository.save(product));
    }

    @Transactional
    public ProductResponse updateInventory(Long id, Integer newStock) {
        Product product = getEntityById(id);
        product.setStock(newStock);
        product.setUpdatedAt(Instant.now());
        Product saved = repository.save(product);

        messagingTemplate.convertAndSend("/topic/inventory", Map.of(
            "productId", saved.getId(),
            "stock", saved.getStock(),
            "updatedAt", saved.getUpdatedAt().toString()));

        return ProductResponse.detail(saved);
    }

    @Transactional
    public ProductResponse updateProduct(Long id, ProductRequest request) {
        Product product = getEntityById(id);
        applyProductDetails(product, request);
        return ProductResponse.detail(repository.save(product));
    }

    @Transactional
    public void deleteProduct(Long id) {
        Product product = getEntityById(id);
        product.setActive(false);
        product.setUpdatedAt(Instant.now());
        repository.save(product);
    }

    private Product getEntityById(Long id) {
        return repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
    }

    private void applyProductDetails(Product product, ProductRequest request) {
        product.setName(request.name());
        product.setDescription(request.description());
        product.setPrice(request.price());
        product.setStock(request.stock());
        product.setCategory(request.category());
        List<String> imageUrls;
        if (request.imageUrls() == null || request.imageUrls().isEmpty()) {
            String slug = request.name().toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
            imageUrls = List.of(
                "https://picsum.photos/seed/" + slug + "-1/1000/700",
                "https://picsum.photos/seed/" + slug + "-2/1000/700",
                "https://picsum.photos/seed/" + slug + "-3/1000/700");
        } else {
            imageUrls = List.copyOf(request.imageUrls());
        }
        product.setImageUrls(imageUrls);
        product.setPrimaryImageUrl(imageUrls.isEmpty() ? null : imageUrls.get(0));
        product.setImageCount(imageUrls.size());
        product.setUpdatedAt(Instant.now());
    }
}
