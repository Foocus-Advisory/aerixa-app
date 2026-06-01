package com.aerixa.app.domain.auth.repository;

import com.aerixa.app.domain.auth.entity.User;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository {
    User save(User user);
    Optional<User> findById(UUID id);
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    void delete(User user);
}
