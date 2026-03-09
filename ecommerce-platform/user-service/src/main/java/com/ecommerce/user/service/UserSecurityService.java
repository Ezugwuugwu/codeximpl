package com.ecommerce.user.service;

import com.ecommerce.user.domain.AppUser;
import com.ecommerce.user.repository.AppUserRepository;
import com.ecommerce.user.service.dto.ChangePasswordRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserSecurityService {

    private final CurrentUserService currentUserService;
    private final AppUserRepository repository;
    private final PasswordEncoder passwordEncoder;

    public UserSecurityService(CurrentUserService currentUserService,
                               AppUserRepository repository,
                               PasswordEncoder passwordEncoder) {
        this.currentUserService = currentUserService;
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public void changePassword(AppUser authenticatedUser, ChangePasswordRequest request) {
        AppUser user = currentUserService.requireCurrentUser(authenticatedUser);

        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect.");
        }

        if (!request.newPassword().equals(request.confirmNewPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New passwords do not match.");
        }

        if (request.currentPassword().equals(request.newPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a password different from the current one.");
        }

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        repository.save(user);
    }
}
