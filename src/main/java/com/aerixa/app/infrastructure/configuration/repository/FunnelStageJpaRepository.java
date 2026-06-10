package com.aerixa.app.infrastructure.configuration.repository;

import com.aerixa.app.domain.configuration.entity.FunnelStage;
import com.aerixa.app.domain.configuration.entity.FunnelStageType;
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
public interface FunnelStageJpaRepository extends JpaRepository<FunnelStage, UUID> {

    List<FunnelStage> findAllByEstablishmentId(UUID establishmentId, Sort sort);

    Optional<FunnelStage> findByIdAndEstablishmentId(UUID id, UUID establishmentId);

    boolean existsByEstablishmentIdAndCodeIgnoreCase(UUID establishmentId, String code);

    boolean existsByEstablishmentIdAndPositionOrderAndActiveTrue(UUID establishmentId, Integer positionOrder);

    boolean existsByEstablishmentIdAndPositionOrderAndActiveTrueAndIdNot(UUID establishmentId, Integer positionOrder, UUID id);

    long countByEstablishmentIdAndStageTypeAndActiveTrue(UUID establishmentId, FunnelStageType stageType);

    long countByEstablishmentIdAndStageTypeAndActiveTrueAndIdNot(UUID establishmentId, FunnelStageType stageType, UUID id);

    @Modifying
    @Query(value = "DELETE FROM auth.funnel_stages WHERE id = :id AND establishment_id = :establishmentId", nativeQuery = true)
    void hardDeleteByIdAndEstablishmentId(@Param("id") UUID id, @Param("establishmentId") UUID establishmentId);
}
