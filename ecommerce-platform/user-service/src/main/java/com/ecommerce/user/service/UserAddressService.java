package com.ecommerce.user.service;

import com.ecommerce.user.domain.AppUser;
import com.ecommerce.user.domain.UserAddress;
import com.ecommerce.user.repository.AppUserRepository;
import com.ecommerce.user.repository.UserAddressRepository;
import com.ecommerce.user.service.dto.UpsertUserAddressRequest;
import com.ecommerce.user.service.dto.UserAddressResponse;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserAddressService {

    private final CurrentUserService currentUserService;
    private final AppUserRepository appUserRepository;
    private final UserAddressRepository userAddressRepository;

    public UserAddressService(CurrentUserService currentUserService,
                              AppUserRepository appUserRepository,
                              UserAddressRepository userAddressRepository) {
        this.currentUserService = currentUserService;
        this.appUserRepository = appUserRepository;
        this.userAddressRepository = userAddressRepository;
    }

    @Transactional(readOnly = true)
    public List<UserAddressResponse> listCurrentUserAddresses(AppUser authenticatedUser) {
        AppUser user = currentUserService.requireCurrentUser(authenticatedUser);
        return userAddressRepository.findByUserIdOrderByDefaultAddressDescUpdatedAtDescCreatedAtDesc(user.getId())
            .stream()
            .map(UserAddressResponse::from)
            .toList();
    }

    @Transactional
    public UserAddressResponse createCurrentUserAddress(AppUser authenticatedUser, UpsertUserAddressRequest request) {
        AppUser user = currentUserService.requireCurrentUser(authenticatedUser);
        UserAddress address = new UserAddress();
        address.setUser(user);
        applyRequest(address, request);

        if (userAddressRepository.countByUserId(user.getId()) == 0) {
            address.setDefaultAddress(true);
        }

        UserAddress saved = userAddressRepository.save(address);
        if (saved.isDefaultAddress()) {
            clearDefaultFlagFromOtherAddresses(user.getId(), saved.getId());
        }
        syncLegacyPrimaryAddress(user);
        return UserAddressResponse.from(saved);
    }

    @Transactional
    public UserAddressResponse updateCurrentUserAddress(AppUser authenticatedUser,
                                                        Long addressId,
                                                        UpsertUserAddressRequest request) {
        AppUser user = currentUserService.requireCurrentUser(authenticatedUser);
        UserAddress address = getOwnedAddress(user.getId(), addressId);
        applyRequest(address, request);
        UserAddress saved = userAddressRepository.save(address);
        if (saved.isDefaultAddress()) {
            clearDefaultFlagFromOtherAddresses(user.getId(), saved.getId());
        }
        ensureOneDefaultAddress(user.getId());
        syncLegacyPrimaryAddress(user);
        return UserAddressResponse.from(saved);
    }

    @Transactional
    public UserAddressResponse setCurrentUserDefaultAddress(AppUser authenticatedUser, Long addressId) {
        AppUser user = currentUserService.requireCurrentUser(authenticatedUser);
        UserAddress address = getOwnedAddress(user.getId(), addressId);
        address.setDefaultAddress(true);
        UserAddress saved = userAddressRepository.save(address);
        clearDefaultFlagFromOtherAddresses(user.getId(), saved.getId());
        ensureOneDefaultAddress(user.getId());
        syncLegacyPrimaryAddress(user);
        return UserAddressResponse.from(saved);
    }

    @Transactional
    public void deleteCurrentUserAddress(AppUser authenticatedUser, Long addressId) {
        AppUser user = currentUserService.requireCurrentUser(authenticatedUser);
        UserAddress address = getOwnedAddress(user.getId(), addressId);
        boolean removedDefault = address.isDefaultAddress();
        userAddressRepository.delete(address);
        if (removedDefault) {
            ensureOneDefaultAddress(user.getId());
        }
        syncLegacyPrimaryAddress(user);
    }

    @Transactional
    public void createOrUpdateRegistrationAddress(AppUser user, String rawAddress) {
        String normalizedAddress = normalize(rawAddress);
        if (normalizedAddress.isBlank()) {
            syncLegacyPrimaryAddress(user);
            return;
        }

        List<UserAddress> addresses = userAddressRepository.findByUserIdOrderByDefaultAddressDescUpdatedAtDescCreatedAtDesc(user.getId());
        UserAddress address = addresses.isEmpty() ? new UserAddress() : addresses.get(0);
        address.setUser(user);
        if (normalize(address.getLabel()).isBlank()) {
            address.setLabel("Primary");
        }
        address.setStreetAddress(normalizedAddress);
        if (normalize(address.getCountry()).isBlank()) {
            address.setCountry("Nigeria");
        }
        address.setDefaultAddress(true);
        UserAddress saved = userAddressRepository.save(address);
        clearDefaultFlagFromOtherAddresses(user.getId(), saved.getId());
        syncLegacyPrimaryAddress(user);
    }

    private UserAddress getOwnedAddress(Long userId, Long addressId) {
        return userAddressRepository.findByIdAndUserId(addressId, userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Address not found."));
    }

    private void applyRequest(UserAddress address, UpsertUserAddressRequest request) {
        address.setLabel(request.label().trim());
        address.setStreetAddress(request.streetAddress().trim());
        address.setCity(request.city().trim());
        address.setState(request.state().trim());
        address.setPostalCode(normalize(request.postalCode()));
        address.setCountry(request.country().trim());
        address.setDefaultAddress(request.defaultAddress());
    }

    private void clearDefaultFlagFromOtherAddresses(Long userId, Long keepAddressId) {
        List<UserAddress> addresses = userAddressRepository.findByUserIdOrderByDefaultAddressDescUpdatedAtDescCreatedAtDesc(userId);
        boolean changed = false;
        for (UserAddress address : addresses) {
            if (!address.getId().equals(keepAddressId) && address.isDefaultAddress()) {
                address.setDefaultAddress(false);
                changed = true;
            }
        }
        if (changed) {
            userAddressRepository.saveAll(addresses);
        }
    }

    private void ensureOneDefaultAddress(Long userId) {
        if (userAddressRepository.findFirstByUserIdAndDefaultAddressTrue(userId).isPresent()) {
            return;
        }

        List<UserAddress> addresses = userAddressRepository.findByUserIdOrderByDefaultAddressDescUpdatedAtDescCreatedAtDesc(userId);
        if (addresses.isEmpty()) {
            return;
        }

        UserAddress firstAddress = addresses.get(0);
        firstAddress.setDefaultAddress(true);
        userAddressRepository.save(firstAddress);
    }

    private void syncLegacyPrimaryAddress(AppUser user) {
        String primaryAddress = userAddressRepository.findFirstByUserIdAndDefaultAddressTrue(user.getId())
            .map(this::formatLegacyAddress)
            .orElseGet(() -> userAddressRepository.findByUserIdOrderByDefaultAddressDescUpdatedAtDescCreatedAtDesc(user.getId())
                .stream()
                .findFirst()
                .map(this::formatLegacyAddress)
                .orElse(""));

        user.setAddress(primaryAddress);
        appUserRepository.save(user);
    }

    private String formatLegacyAddress(UserAddress address) {
        return List.of(
                normalize(address.getStreetAddress()),
                normalize(address.getCity()),
                normalize(address.getState()),
                normalize(address.getPostalCode()),
                normalize(address.getCountry()))
            .stream()
            .filter(value -> !value.isBlank())
            .reduce((left, right) -> left + ", " + right)
            .orElse("");
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}
