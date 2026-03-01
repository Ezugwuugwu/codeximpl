package com.ecommerce.user.config;

import com.ecommerce.user.domain.AppUser;
import com.ecommerce.user.domain.Role;
import com.ecommerce.user.repository.AppUserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);

    private final AppUserRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final String adminEmail;
    private final String adminPassword;

    public AdminSeeder(AppUserRepository repository,
                       PasswordEncoder passwordEncoder,
                       @Value("${admin.seed.email:}") String adminEmail,
                       @Value("${admin.seed.password:}") String adminPassword) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
    }

    @Override
    public void run(String... args) {
        if (adminEmail.isBlank() || adminPassword.isBlank()) {
            log.info("ADMIN_EMAIL or ADMIN_PASSWORD not set — skipping admin seed.");
            return;
        }

        if (repository.existsByEmail(adminEmail.toLowerCase())) {
            log.info("Admin account already exists for {} — skipping seed.", adminEmail);
            return;
        }

        AppUser admin = new AppUser();
        admin.setEmail(adminEmail.toLowerCase());
        admin.setPassword(passwordEncoder.encode(adminPassword));
        admin.setFirstName("System");
        admin.setLastName("Admin");
        admin.setAddress("Head Office");
        admin.setRole(Role.ADMIN);
        admin.setEnabled(true);
        repository.save(admin);
        log.info("Admin account created for {}.", adminEmail);
    }
}
