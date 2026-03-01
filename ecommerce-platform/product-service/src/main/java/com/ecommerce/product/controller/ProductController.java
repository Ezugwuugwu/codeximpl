package com.ecommerce.product.controller;

import com.ecommerce.product.domain.Product;
import com.ecommerce.product.service.ProductCatalogService;
import com.ecommerce.product.service.dto.InventoryUpdateRequest;
import com.ecommerce.product.service.dto.ProductRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductCatalogService service;

    public ProductController(ProductCatalogService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<Page<Product>> list(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size) {
        var pageable = PageRequest.of(page, Math.min(size, 100), Sort.by("updatedAt").descending());
        return ResponseEntity.ok(service.listActiveProducts(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> getById(@PathVariable("id") Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @GetMapping("/search")
    public ResponseEntity<List<Product>> search(@RequestParam(required = false) String q) {
        return ResponseEntity.ok(service.search(q));
    }

    @GetMapping("/recommendations/{userId}")
    public ResponseEntity<List<Product>> recommendations(@PathVariable("userId") Long userId) {
        return ResponseEntity.ok(service.recommendations(userId));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Product> create(@Valid @RequestBody ProductRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createProduct(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Product> update(@PathVariable("id") Long id, @Valid @RequestBody ProductRequest request) {
        return ResponseEntity.ok(service.updateProduct(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable("id") Long id) {
        service.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/inventory")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Product> updateInventory(@PathVariable("id") Long id,
                                                   @Valid @RequestBody InventoryUpdateRequest request) {
        return ResponseEntity.ok(service.updateInventory(id, request.stock()));
    }
}
