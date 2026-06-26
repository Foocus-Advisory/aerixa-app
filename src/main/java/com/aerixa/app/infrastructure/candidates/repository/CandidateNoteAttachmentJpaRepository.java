package com.aerixa.app.infrastructure.candidates.repository;

import com.aerixa.app.domain.candidates.entity.CandidateNoteAttachment;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CandidateNoteAttachmentJpaRepository extends JpaRepository<CandidateNoteAttachment, UUID> {

    List<CandidateNoteAttachment> findAllByCandidateNoteIdAndDeletedAtIsNull(UUID candidateNoteId, Sort sort);

    List<CandidateNoteAttachment> findAllByCandidateNoteIdInAndDeletedAtIsNull(List<UUID> candidateNoteIds, Sort sort);

    List<CandidateNoteAttachment> findAllByCandidateNoteIdIn(List<UUID> candidateNoteIds, Sort sort);

    Optional<CandidateNoteAttachment> findByIdAndEstablishmentId(UUID id, UUID establishmentId);
}
