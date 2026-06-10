package com.aerixa.app.infrastructure.configuration.repository;

import com.aerixa.app.domain.configuration.entity.ProgramTrackLevel;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
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
}
