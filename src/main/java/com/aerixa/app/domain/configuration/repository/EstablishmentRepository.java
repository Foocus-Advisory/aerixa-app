package com.aerixa.app.domain.configuration.repository;

import com.aerixa.app.domain.configuration.entity.Establishment;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EstablishmentRepository {
    Establishment save(Establishment establishment);
    Optional<Establishment> findById(UUID id);
    Optional<Establishment> findByCode(String code);
    List<Establishment> findAll();
    List<Establishment> findAllByCreatedByUserId(UUID createdByUserId);
    long countByCreatedByUserId(UUID createdByUserId);
}
