package com.ecommerce.user.security;

import com.ecommerce.user.domain.AppUser;
import com.ecommerce.user.domain.Role;
import java.util.Base64;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {

    // 32-byte key encoded as Base64 — satisfies JwtService's 256-bit minimum
    private static final String TEST_SECRET =
        Base64.getEncoder().encodeToString("testingtestingtestingtestingtest".getBytes());

    private JwtService jwtService;
    private AppUser testUser;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(TEST_SECRET);

        testUser = new AppUser();
        testUser.setEmail("alice@example.com");
        testUser.setPassword("$2a$encoded");
        testUser.setRole(Role.USER);
    }

    @Test
    void generateToken_returnsNonNullToken() {
        String token = jwtService.generateToken(testUser, Map.of("role", "USER"));

        assertThat(token).isNotNull().isNotBlank();
    }

    @Test
    void extractUsername_fromValidToken_returnsEmail() {
        String token = jwtService.generateToken(testUser, Map.of("role", "USER"));

        String username = jwtService.extractUsername(token);

        assertThat(username).isEqualTo("alice@example.com");
    }

    @Test
    void isTokenValid_validTokenAndMatchingUser_returnsTrue() {
        String token = jwtService.generateToken(testUser, Map.of("role", "USER"));

        boolean valid = jwtService.isTokenValid(token, testUser);

        assertThat(valid).isTrue();
    }

    @Test
    void isTokenValid_tokenForDifferentUser_returnsFalse() {
        String token = jwtService.generateToken(testUser, Map.of("role", "USER"));

        AppUser anotherUser = new AppUser();
        anotherUser.setEmail("bob@example.com");
        anotherUser.setPassword("irrelevant");
        anotherUser.setRole(Role.USER);

        boolean valid = jwtService.isTokenValid(token, anotherUser);

        assertThat(valid).isFalse();
    }
}
