package com.aerixa.app.infrastructure.configuration.repository;

import com.aerixa.app.domain.configuration.entity.UserPipelineViewPreference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserPipelineViewPreferenceJpaRepository extends JpaRepository<UserPipelineViewPreference, UUID> {

    Optional<UserPipelineViewPreference> findByUserIdAndEstablishmentId(UUID userId, UUID establishmentId);
}
