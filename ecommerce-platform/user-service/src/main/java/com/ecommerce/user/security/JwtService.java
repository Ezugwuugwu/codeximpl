package com.ecommerce.user.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.time.Instant;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private final SecretKey key;

    public JwtService(@Value("${security.jwt.secret}") String secret) {
        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(secret);
        } catch (RuntimeException e) {
            throw new IllegalStateException(
                "JWT secret must be a valid Base64-encoded string. " +
                "Generate one with: python -c \"import secrets, base64; print(base64.b64encode(secrets.token_bytes(32)).decode())\"", e);
        }
        if (keyBytes.length < 32) {
            throw new IllegalStateException(
                "JWT secret is too short (" + keyBytes.length + " bytes decoded). " +
                "Must be at least 256 bits (32 bytes) when Base64-decoded.");
        }
        this.key = Keys.hmacShaKeyFor(keyBytes);
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> resolver) {
        Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
        return resolver.apply(claims);
    }

    public String generateToken(UserDetails userDetails, Map<String, Object> claims) {
        Instant now = Instant.now();
        return Jwts.builder()
            .claims(new HashMap<>(claims))
            .subject(userDetails.getUsername())
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plusSeconds(24 * 60 * 60)))
            .signWith(key, SignatureAlgorithm.HS256)
            .compact();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        String username = extractUsername(token);
        Date expiration = extractClaim(token, Claims::getExpiration);
        return username.equals(userDetails.getUsername()) && expiration.after(new Date());
    }

}
