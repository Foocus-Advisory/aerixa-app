package com.aerixa.app.infrastructure.configuration.repository;

import com.aerixa.app.domain.configuration.entity.Establishment;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EstablishmentJpaRepository extends JpaRepository<Establishment, UUID> {

    List<Establishment> findAllByCreatedByUserId(UUID createdByUserId, Sort sort);

    Optional<Establishment> findByIdAndCreatedByUserId(UUID id, UUID createdByUserId);

    boolean existsByCreatedByUserId(UUID createdByUserId);

    boolean existsByCode(String code);
}
