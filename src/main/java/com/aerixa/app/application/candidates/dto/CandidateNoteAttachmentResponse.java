package com.aerixa.app.application.candidates.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidateNoteAttachmentResponse {
    private UUID id;
    private UUID candidateNoteId;
    private String contentType;
    private String filename;
    private long fileSize;
    private UUID uploadedByUserId;
    private String uploadedByLabel;
    private LocalDateTime createdAt;
}
