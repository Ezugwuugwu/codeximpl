package com.ecommerce.user.service;

import com.ecommerce.user.domain.AppUser;
import com.ecommerce.user.domain.Role;
import com.ecommerce.user.repository.AppUserRepository;
import com.ecommerce.user.security.JwtService;
import com.ecommerce.user.service.dto.AuthResponse;
import com.ecommerce.user.service.dto.LoginRequest;
import com.ecommerce.user.service.dto.RegisterRequest;
import com.ecommerce.user.service.dto.RegisterResponse;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AuthServiceTest {

    @Mock
    private AppUserRepository repository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtService jwtService;

    @Mock
    private OtpService otpService;

    @InjectMocks
    private AuthService authService;

    @Test
    void register_success_sendsOtpAndReturnsMessage() {
        when(repository.existsByEmail("alice@example.com")).thenReturn(false);
        when(passwordEncoder.encode("secret123")).thenReturn("$2a$encoded");

        AppUser saved = new AppUser() {
            @Override
            public Long getId() { return 1L; }
        };
        saved.setEmail("alice@example.com");
        saved.setPassword("$2a$encoded");
        saved.setRole(Role.USER);
        saved.setEnabled(false);
        when(repository.save(any(AppUser.class))).thenReturn(saved);

        RegisterResponse response = authService.register(
            new RegisterRequest("Alice", "Johnson", "100 Market Street", "alice@example.com", "secret123", "secret123"));

        assertThat(response.email()).isEqualTo("alice@example.com");
        assertThat(response.message()).isNotBlank();
        verify(repository).save(any(AppUser.class));
        verify(otpService).generateAndSend("alice@example.com");
    }

    @Test
    void register_passwordMismatch_throwsBadRequest() {
        assertThatThrownBy(() -> authService.register(
                new RegisterRequest("Alice", "Johnson", "100 Market Street", "alice@example.com", "secret123", "different")))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST));

        verify(repository, never()).save(any());
    }

    @Test
    void register_duplicateEmail_throwsConflict() {
        when(repository.existsByEmail("alice@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(
                new RegisterRequest("Alice", "Johnson", "100 Market Street", "alice@example.com", "secret123", "secret123")))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT));

        verify(repository, never()).save(any());
    }

    @Test
    void login_validCredentials_returnsToken() {
        AppUser user = new AppUser();
        user.setEmail("alice@example.com");
        user.setPassword("$2a$encoded");
        user.setRole(Role.USER);
        user.setEnabled(true);

        when(repository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
        when(jwtService.generateToken(any(AppUser.class), any(Map.class))).thenReturn("jwt.token.here");

        AuthResponse response = authService.login(new LoginRequest("alice@example.com", "secret123"));

        assertThat(response.token()).isEqualTo("jwt.token.here");
        assertThat(response.email()).isEqualTo("alice@example.com");
        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
    }

    @Test
    void login_badCredentials_throwsUnauthorized() {
        when(authenticationManager.authenticate(any()))
            .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThatThrownBy(() -> authService.login(new LoginRequest("alice@example.com", "wrong")))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED));
    }
}
