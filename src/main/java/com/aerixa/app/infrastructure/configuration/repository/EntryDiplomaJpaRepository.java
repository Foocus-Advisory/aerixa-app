package com.aerixa.app.infrastructure.configuration.repository;

import com.aerixa.app.domain.configuration.entity.EntryDiploma;
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
public interface EntryDiplomaJpaRepository extends JpaRepository<EntryDiploma, UUID> {

    List<EntryDiploma> findAllByEstablishmentId(UUID establishmentId, Sort sort);

    Optional<EntryDiploma> findByIdAndEstablishmentId(UUID id, UUID establishmentId);

    Optional<EntryDiploma> findByEstablishmentIdAndCodeIgnoreCase(UUID establishmentId, String code);

    boolean existsByEstablishmentIdAndCodeIgnoreCase(UUID establishmentId, String code);

    boolean existsByEstablishmentIdAndCodeIgnoreCaseAndIdNot(UUID establishmentId, String code, UUID id);

    // rank_order is intentionally NOT unique: multiple diplomas may share the same rank
    // (e.g. GCE and Baccalauréat are equivalent entry requirements).
    // Matching against an academic level will use a "rank >= required rank" predicate, not equality.

    @Modifying
    @Query(value = "DELETE FROM auth.entry_diplomas WHERE id = :id AND establishment_id = :establishmentId", nativeQuery = true)
    void hardDeleteByIdAndEstablishmentId(@Param("id") UUID id, @Param("establishmentId") UUID establishmentId);

    @Query(value = "SELECT ed.* FROM auth.entry_diplomas ed " +
            "JOIN auth.academic_level_entry_diplomas aled ON ed.id = aled.entry_diploma_id " +
            "WHERE aled.academic_level_id = :academicLevelId AND ed.deleted_at IS NULL " +
            "ORDER BY ed.rank_order ASC, ed.label ASC", nativeQuery = true)
    List<EntryDiploma> findByAcademicLevelId(@Param("academicLevelId") UUID academicLevelId);
}
