package com.ecommerce.payment.controller;

import com.ecommerce.payment.service.PaymentProcessingService;
import com.ecommerce.payment.service.dto.PaymentIntentCreateRequest;
import com.ecommerce.payment.service.dto.PaymentIntentCreateResponse;
import com.ecommerce.payment.service.dto.PaymentProcessRequest;
import com.ecommerce.payment.service.dto.PaymentProcessResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentProcessingService service;

    public PaymentController(PaymentProcessingService service) {
        this.service = service;
    }

    @PostMapping("/intent")
    public ResponseEntity<PaymentIntentCreateResponse> createIntent(@Valid @RequestBody PaymentIntentCreateRequest request) {
        return ResponseEntity.ok(service.createIntent(request));
    }

    @PostMapping("/process")
    public ResponseEntity<PaymentProcessResponse> process(@Valid @RequestBody PaymentProcessRequest request) {
        return ResponseEntity.ok(service.process(request));
    }
}
