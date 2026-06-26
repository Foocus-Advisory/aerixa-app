package com.aerixa.app.infrastructure.candidates.repository;

import com.aerixa.app.domain.candidates.entity.CandidateNote;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CandidateNoteJpaRepository extends JpaRepository<CandidateNote, UUID> {

    List<CandidateNote> findAllByEstablishmentIdAndCandidateId(UUID establishmentId, UUID candidateId, Sort sort);

    List<CandidateNote> findAllByEstablishmentIdAndCandidateApplicationIdAndDeletedAtIsNull(
            UUID establishmentId, UUID candidateApplicationId, Sort sort);

    List<CandidateNote> findAllByEstablishmentIdAndCandidateApplicationId(
            UUID establishmentId, UUID candidateApplicationId, Sort sort);

    Optional<CandidateNote> findByIdAndEstablishmentId(UUID id, UUID establishmentId);
}
