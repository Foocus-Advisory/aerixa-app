package com.aerixa.app.infrastructure.configuration.repository;

import com.aerixa.app.domain.configuration.entity.AcademicLevel;
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
public interface AcademicLevelJpaRepository extends JpaRepository<AcademicLevel, UUID> {

    List<AcademicLevel> findAllByEstablishmentId(UUID establishmentId, Sort sort);

    Optional<AcademicLevel> findByIdAndEstablishmentId(UUID id, UUID establishmentId);

    boolean existsByEstablishmentIdAndCodeIgnoreCase(UUID establishmentId, String code);

    boolean existsByEstablishmentIdAndCodeIgnoreCaseAndIdNot(UUID establishmentId, String code, UUID id);

    boolean existsByEstablishmentIdAndRankOrder(UUID establishmentId, Integer rankOrder);

    boolean existsByEstablishmentIdAndRankOrderAndIdNot(UUID establishmentId, Integer rankOrder, UUID id);

    @Modifying
    @Query(value = "DELETE FROM auth.academic_levels WHERE id = :id AND establishment_id = :establishmentId", nativeQuery = true)
    void hardDeleteByIdAndEstablishmentId(@Param("id") UUID id, @Param("establishmentId") UUID establishmentId);

    @Modifying
    @Query(value = "INSERT INTO auth.academic_level_entry_diplomas (academic_level_id, entry_diploma_id, attached_by_user_id) " +
            "VALUES (:alId, :edId, :userId) ON CONFLICT DO NOTHING", nativeQuery = true)
    void attachEntryDiploma(@Param("alId") UUID alId, @Param("edId") UUID edId, @Param("userId") UUID userId);

    @Modifying
    @Query(value = "DELETE FROM auth.academic_level_entry_diplomas WHERE academic_level_id = :alId AND entry_diploma_id = :edId", nativeQuery = true)
    void detachEntryDiploma(@Param("alId") UUID alId, @Param("edId") UUID edId);

    @Query(value = "SELECT COUNT(*) FROM auth.academic_level_entry_diplomas WHERE academic_level_id = :alId", nativeQuery = true)
    long countEntryDiplomas(@Param("alId") UUID alId);

    @Query(value = "SELECT EXISTS(SELECT 1 FROM auth.academic_level_entry_diplomas WHERE academic_level_id = :alId AND entry_diploma_id = :edId)", nativeQuery = true)
    boolean existsAttachment(@Param("alId") UUID alId, @Param("edId") UUID edId);
}
