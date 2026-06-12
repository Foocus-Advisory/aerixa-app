package com.aerixa.app.infrastructure.configuration.repository;

import com.aerixa.app.domain.configuration.entity.FunnelStageTransition;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FunnelStageTransitionJpaRepository extends JpaRepository<FunnelStageTransition, UUID> {

    List<FunnelStageTransition> findAllByEstablishmentId(UUID establishmentId, Sort sort);

    Optional<FunnelStageTransition> findByIdAndEstablishmentId(UUID id, UUID establishmentId);

    boolean existsByEstablishmentIdAndFromStageIdAndToStageId(UUID establishmentId, UUID fromStageId, UUID toStageId);

    boolean existsByEstablishmentIdAndFromStageIdAndToStageIdAndActiveTrue(UUID establishmentId, UUID fromStageId, UUID toStageId);

    boolean existsByEstablishmentIdAndFromStageIdAndToStageIdAndIdNot(UUID establishmentId, UUID fromStageId, UUID toStageId, UUID id);

    @Modifying
    @Query(value = "DELETE FROM auth.funnel_stage_transitions WHERE id = :id AND establishment_id = :establishmentId", nativeQuery = true)
    void hardDeleteByIdAndEstablishmentId(@Param("id") UUID id, @Param("establishmentId") UUID establishmentId);
}
