package com.aerixa.app.application.candidates.storage;

import com.aerixa.app.domain.candidates.entity.AttachmentStorageType;
import com.aerixa.app.domain.candidates.entity.CandidateNoteAttachment;
import org.springframework.stereotype.Component;

/**
 * Implementation par defaut de {@link AttachmentStorage} : le contenu binaire est stocke
 * directement dans la base de donnees (colonne {@code file_content}), sur le meme modele
 * que le logo d'etablissement.
 */
@Component
public class DatabaseAttachmentStorage implements AttachmentStorage {

    @Override
    public void store(CandidateNoteAttachment attachment, byte[] content) {
        attachment.setStorageType(AttachmentStorageType.DATABASE);
        attachment.setStorageRef(null);
        attachment.setFileContent(content);
    }

    @Override
    public byte[] retrieve(CandidateNoteAttachment attachment) {
        return attachment.getFileContent();
    }

    @Override
    public void delete(CandidateNoteAttachment attachment) {
        attachment.setFileContent(null);
    }
}
