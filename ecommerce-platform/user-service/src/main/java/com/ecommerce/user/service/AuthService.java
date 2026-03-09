package com.ecommerce.user.service;

import com.ecommerce.user.domain.AppUser;
import com.ecommerce.user.domain.Role;
import com.ecommerce.user.repository.AppUserRepository;
import com.ecommerce.user.security.JwtService;
import com.ecommerce.user.service.dto.AuthResponse;
import com.ecommerce.user.service.dto.LoginRequest;
import com.ecommerce.user.service.dto.RegisterRequest;
import com.ecommerce.user.service.dto.RegisterResponse;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final AppUserRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final OtpService otpService;
    private final UserAddressService userAddressService;

    public AuthService(AppUserRepository repository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtService jwtService,
                       OtpService otpService,
                       UserAddressService userAddressService) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.otpService = otpService;
        this.userAddressService = userAddressService;
    }

    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        if (!request.password().equals(request.confirmPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Passwords do not match");
        }

        String email = request.email().toLowerCase();
        Optional<AppUser> existing = repository.findByEmail(email);

        if (existing.isPresent()) {
            AppUser existingUser = existing.get();
            if (existingUser.isEnabled()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
            }
            // Unverified account: update details and resend OTP.
            existingUser.setPassword(passwordEncoder.encode(request.password()));
            existingUser.setFirstName(request.firstName().trim());
            existingUser.setLastName(request.lastName().trim());
            existingUser.setAddress(request.address().trim());
            repository.save(existingUser);
            userAddressService.createOrUpdateRegistrationAddress(existingUser, request.address());
            otpService.generateAndSend(email);
            return new RegisterResponse("A verification code has been sent to your email.", email);
        }

        AppUser user = new AppUser();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        user.setAddress(request.address().trim());
        user.setRole(Role.USER);
        user.setEnabled(false);
        AppUser savedUser = repository.save(user);
        userAddressService.createOrUpdateRegistrationAddress(savedUser, request.address());

        otpService.generateAndSend(email);

        return new RegisterResponse("A verification code has been sent to your email.", email);
    }

    public AuthResponse verifyOtp(String email, String otp) {
        otpService.verify(email.toLowerCase(), otp);

        AppUser user = repository.findByEmail(email.toLowerCase())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        String token = jwtService.generateToken(user, buildClaims(user));
        return new AuthResponse(token, user.getEmail(), user.getRole());
    }

    public void resendOtp(String email) {
        if (!repository.existsByEmail(email.toLowerCase())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No account found with this email.");
        }
        otpService.generateAndSend(email.toLowerCase());
    }

    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email().toLowerCase(), request.password()));
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        AppUser user = repository.findByEmail(request.email().toLowerCase())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        String token = jwtService.generateToken(user, buildClaims(user));
        return new AuthResponse(token, user.getEmail(), user.getRole());
    }

    private Map<String, Object> buildClaims(AppUser user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", user.getRole().name());
        String first = user.getFirstName() == null ? "" : user.getFirstName().trim();
        String last = user.getLastName() == null ? "" : user.getLastName().trim();
        String fullName = (first + " " + last).trim();
        if (!fullName.isBlank()) {
            claims.put("name", fullName);
        }
        return claims;
    }
}
