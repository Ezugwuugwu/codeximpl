package com.ecommerce.user.service;

import com.ecommerce.user.domain.AppUser;
import com.ecommerce.user.domain.Role;
import com.ecommerce.user.repository.AppUserRepository;
import com.ecommerce.user.security.JwtService;
import com.ecommerce.user.service.dto.AuthResponse;
import com.ecommerce.user.service.dto.LoginRequest;
import com.ecommerce.user.service.dto.RegisterRequest;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final AppUserRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(AppUserRepository repository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtService jwtService) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    public AuthResponse register(RegisterRequest request) {
        if (repository.existsByEmail(request.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
        }

        AppUser user = new AppUser();
        user.setEmail(request.email().toLowerCase());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole(request.role() == null ? Role.USER : request.role());

        AppUser saved = repository.save(user);
        String token = jwtService.generateToken(saved, Map.of("role", saved.getRole().name()));
        return new AuthResponse(token, saved.getEmail(), saved.getRole());
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.email().toLowerCase(), request.password()));

        AppUser user = repository.findByEmail(request.email().toLowerCase())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        String token = jwtService.generateToken(user, Map.of("role", user.getRole().name()));
        return new AuthResponse(token, user.getEmail(), user.getRole());
    }
}
