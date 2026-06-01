package com.aerixa.app.domain.auth.repository;

import com.aerixa.app.domain.auth.entity.Role;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RoleRepository {
    Role save(Role role);
    Optional<Role> findById(UUID id);
    Optional<Role> findByName(String name);
    List<Role> findByNameIn(List<String> names);
    List<Role> findAll();
    void delete(Role role);
}
