package com.aerixa.app.infrastructure.config;

import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class SuperAdminPasswordInitializer implements CommandLineRunner {

    private static final String SUPER_ADMIN_EMAIL = "foocus.advisory@gmail.com";
    private static final String TEMP_PASSWORD = "GeneratedStrong123!";
    private static final String PLACEHOLDER = "GeneratedStrong123PlaceholderHashWillBeReplacedAtRuntime";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        userRepository.findByEmail(SUPER_ADMIN_EMAIL).ifPresent(this::replacePlaceholderIfNeeded);
    }

    private void replacePlaceholderIfNeeded(User user) {
        String currentHash = user.getPasswordHash();
        if (currentHash == null || !currentHash.contains(PLACEHOLDER)) {
            return;
        }

        user.setPasswordHash(passwordEncoder.encode(TEMP_PASSWORD));
        userRepository.save(user);
        log.warn("Le mot de passe temporaire du SUPER_ADMIN a été initialisé. Change-le immédiatement après connexion.");
    }
}
