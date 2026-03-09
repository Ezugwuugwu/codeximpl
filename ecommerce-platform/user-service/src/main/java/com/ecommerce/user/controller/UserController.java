package com.ecommerce.user.controller;

import com.ecommerce.user.domain.AppUser;
import com.ecommerce.user.service.UserAddressService;
import com.ecommerce.user.service.UserProfileService;
import com.ecommerce.user.service.UserSecurityService;
import com.ecommerce.user.service.dto.ChangePasswordRequest;
import com.ecommerce.user.service.dto.UpdateUserProfileRequest;
import com.ecommerce.user.service.dto.UpsertUserAddressRequest;
import com.ecommerce.user.service.dto.UserAddressResponse;
import com.ecommerce.user.service.dto.UserProfileResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserProfileService userProfileService;
    private final UserSecurityService userSecurityService;
    private final UserAddressService userAddressService;

    public UserController(UserProfileService userProfileService,
                          UserSecurityService userSecurityService,
                          UserAddressService userAddressService) {
        this.userProfileService = userProfileService;
        this.userSecurityService = userSecurityService;
        this.userAddressService = userAddressService;
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> currentUser(@AuthenticationPrincipal AppUser user) {
        return ResponseEntity.ok(userProfileService.getCurrentProfile(user));
    }

    @PutMapping("/me")
    public ResponseEntity<UserProfileResponse> updateCurrentUser(@AuthenticationPrincipal AppUser user,
                                                                 @Valid @RequestBody UpdateUserProfileRequest request) {
        return ResponseEntity.ok(userProfileService.updateCurrentProfile(user, request));
    }

    @PutMapping("/me/password")
    public ResponseEntity<Map<String, String>> changePassword(@AuthenticationPrincipal AppUser user,
                                                              @Valid @RequestBody ChangePasswordRequest request) {
        userSecurityService.changePassword(user, request);
        return ResponseEntity.status(HttpStatus.OK)
            .body(Map.of("message", "Password updated successfully."));
    }

    @GetMapping("/me/addresses")
    public ResponseEntity<List<UserAddressResponse>> listCurrentUserAddresses(@AuthenticationPrincipal AppUser user) {
        return ResponseEntity.ok(userAddressService.listCurrentUserAddresses(user));
    }

    @PostMapping("/me/addresses")
    public ResponseEntity<UserAddressResponse> createCurrentUserAddress(@AuthenticationPrincipal AppUser user,
                                                                        @Valid @RequestBody UpsertUserAddressRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(userAddressService.createCurrentUserAddress(user, request));
    }

    @PutMapping("/me/addresses/{addressId}")
    public ResponseEntity<UserAddressResponse> updateCurrentUserAddress(@AuthenticationPrincipal AppUser user,
                                                                        @PathVariable Long addressId,
                                                                        @Valid @RequestBody UpsertUserAddressRequest request) {
        return ResponseEntity.ok(userAddressService.updateCurrentUserAddress(user, addressId, request));
    }

    @DeleteMapping("/me/addresses/{addressId}")
    public ResponseEntity<Void> deleteCurrentUserAddress(@AuthenticationPrincipal AppUser user,
                                                         @PathVariable Long addressId) {
        userAddressService.deleteCurrentUserAddress(user, addressId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/admin/ping")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> adminPing() {
        return ResponseEntity.ok(Map.of("message", "Admin access granted"));
    }
}
