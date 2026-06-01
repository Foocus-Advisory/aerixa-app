package com.aerixa.app.infrastructure.auth.repository;

import com.aerixa.app.domain.auth.entity.Role;
import com.aerixa.app.domain.auth.repository.RoleRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoleJpaRepository extends JpaRepository<Role, UUID>, RoleRepository {
    @Override
    Optional<Role> findByName(String name);
}
