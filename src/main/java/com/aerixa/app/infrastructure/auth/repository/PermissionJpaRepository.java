package com.aerixa.app.infrastructure.auth.repository;

import com.aerixa.app.domain.auth.entity.Permission;
import com.aerixa.app.domain.auth.repository.PermissionRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PermissionJpaRepository extends JpaRepository<Permission, UUID>, PermissionRepository {
    @Override
    Optional<Permission> findByName(String name);

    List<Permission> findAllByOrderByModuleAscNameAsc();
}
