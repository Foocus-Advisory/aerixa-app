package com.aerixa.app.infrastructure.whatsapp.repository;

import com.aerixa.app.domain.whatsapp.entity.CandidateConversation;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CandidateConversationJpaRepository extends JpaRepository<CandidateConversation, UUID> {

    Optional<CandidateConversation> findByEstablishmentIdAndTargetPhoneNumber(UUID establishmentId, String targetPhoneNumber);

    Optional<CandidateConversation> findByIdAndEstablishmentId(UUID id, UUID establishmentId);

    List<CandidateConversation> findAllByEstablishmentIdAndCandidateId(UUID establishmentId, UUID candidateId, Sort sort);

    List<CandidateConversation> findAllByEstablishmentIdAndCandidateIdIsNull(UUID establishmentId, Sort sort);
}
