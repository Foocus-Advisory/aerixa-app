package com.aerixa.app.infrastructure.configuration.repository;

import com.aerixa.app.domain.configuration.entity.ProgramTrackLevel;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProgramTrackLevelJpaRepository extends JpaRepository<ProgramTrackLevel, UUID> {

    List<ProgramTrackLevel> findAllByEstablishmentId(UUID establishmentId, Sort sort);

    Optional<ProgramTrackLevel> findByIdAndEstablishmentId(UUID id, UUID establishmentId);

    boolean existsByEstablishmentIdAndProgramTrackIdAndAcademicLevelId(UUID establishmentId, UUID programTrackId, UUID academicLevelId);

    boolean existsByEstablishmentIdAndProgramTrackIdAndAcademicLevelIdAndIdNot(UUID establishmentId, UUID programTrackId, UUID academicLevelId, UUID id);

    @Query(value = "SELECT ptl.* FROM auth.program_track_levels ptl " +
            "JOIN auth.academic_levels al ON al.id = ptl.academic_level_id " +
            "WHERE ptl.establishment_id = :establishmentId " +
            "AND ptl.deleted_at IS NULL AND al.deleted_at IS NULL " +
            "AND ptl.is_open_for_application = TRUE AND al.is_active = TRUE " +
            "AND al.rank_order <= :maxRankOrder " +
            "ORDER BY al.rank_order ASC", nativeQuery = true)
    List<ProgramTrackLevel> findEligibleByEstablishmentIdAndMaxRankOrder(
            @Param("establishmentId") UUID establishmentId, @Param("maxRankOrder") Integer maxRankOrder);
}
