package com.aerixa.app.infrastructure.whatsapp.repository;

import com.aerixa.app.domain.whatsapp.entity.CandidateConversationMessage;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CandidateConversationMessageJpaRepository extends JpaRepository<CandidateConversationMessage, UUID> {

    List<CandidateConversationMessage> findAllByConversationId(UUID conversationId, Sort sort);

    Optional<CandidateConversationMessage> findByWhatsappMessageId(String whatsappMessageId);
}
