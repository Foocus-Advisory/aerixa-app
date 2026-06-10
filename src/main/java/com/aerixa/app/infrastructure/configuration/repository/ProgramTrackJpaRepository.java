package com.aerixa.app.infrastructure.configuration.repository;

import com.aerixa.app.domain.configuration.entity.ProgramTrack;
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
public interface ProgramTrackJpaRepository extends JpaRepository<ProgramTrack, UUID> {

    List<ProgramTrack> findAllByEstablishmentId(UUID establishmentId, Sort sort);

    Optional<ProgramTrack> findByIdAndEstablishmentId(UUID id, UUID establishmentId);

    boolean existsByEstablishmentIdAndCodeIgnoreCase(UUID establishmentId, String code);

    boolean existsByEstablishmentIdAndCodeIgnoreCaseAndIdNot(UUID establishmentId, String code, UUID id);

    @Query(value = "SELECT pt.* FROM auth.program_tracks pt WHERE pt.establishment_id = :establishmentId ORDER BY pt.name ASC", nativeQuery = true)
    List<ProgramTrack> findAllByEstablishmentIdIncludingDeleted(@Param("establishmentId") UUID establishmentId);

    @Modifying
    @Query(value = "DELETE FROM auth.program_tracks WHERE id = :id AND establishment_id = :establishmentId", nativeQuery = true)
    void hardDeleteByIdAndEstablishmentId(@Param("id") UUID id, @Param("establishmentId") UUID establishmentId);
}
