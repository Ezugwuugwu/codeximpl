package com.ecommerce.user.service;

import com.ecommerce.user.domain.AppUser;
import com.ecommerce.user.repository.AppUserRepository;
import com.ecommerce.user.service.dto.UpdateUserProfileRequest;
import com.ecommerce.user.service.dto.UserProfileResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserProfileService {

    private final AppUserRepository repository;
    private final CurrentUserService currentUserService;

    public UserProfileService(AppUserRepository repository, CurrentUserService currentUserService) {
        this.repository = repository;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getCurrentProfile(AppUser authenticatedUser) {
        return UserProfileResponse.from(currentUserService.requireCurrentUser(authenticatedUser));
    }

    @Transactional
    public UserProfileResponse updateCurrentProfile(AppUser authenticatedUser, UpdateUserProfileRequest request) {
        AppUser user = currentUserService.requireCurrentUser(authenticatedUser);
        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        return UserProfileResponse.from(repository.save(user));
    }
}
