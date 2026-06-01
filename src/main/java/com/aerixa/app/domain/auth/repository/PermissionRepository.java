package com.aerixa.app.domain.auth.repository;

import com.aerixa.app.domain.auth.entity.Permission;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PermissionRepository {
    Optional<Permission> findById(UUID id);
    Optional<Permission> findByName(String name);
    List<Permission> findAll();
}
