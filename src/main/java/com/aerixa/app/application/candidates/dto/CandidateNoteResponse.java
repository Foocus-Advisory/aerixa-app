package com.aerixa.app.application.candidates.dto;

import com.aerixa.app.domain.candidates.entity.CandidateNoteType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidateNoteResponse {
    private UUID id;
    private UUID establishmentId;
    private UUID candidateId;
    private UUID candidateApplicationId;
    private CandidateNoteType type;
    private String content;
    private UUID authorUserId;
    private String authorLabel;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private boolean edited;
    private boolean editableByCurrentUser;
    private boolean deletableByCurrentUser;
    private List<CandidateNoteAttachmentResponse> attachments;
}
