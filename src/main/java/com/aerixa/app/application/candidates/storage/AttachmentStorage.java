package com.aerixa.app.application.candidates.storage;

import com.aerixa.app.domain.candidates.entity.CandidateNoteAttachment;

/**
 * Abstraction du stockage du contenu binaire d'une piece jointe de note de candidature.
 * L'implementation par defaut ({@link DatabaseAttachmentStorage}) stocke le contenu en
 * base de donnees. Une future implementation pourra deleguer a un stockage objet externe
 * (S3/MinIO) en remplissant {@code storageRef} au lieu de {@code fileContent}, sans
 * changer le contrat de cette interface ni des services/controllers qui l'utilisent.
 */
public interface AttachmentStorage {

    /**
     * Persiste le contenu binaire pour la piece jointe donnee. Doit renseigner sur
     * {@code attachment} les champs propres au mode de stockage ({@code storageType},
     * et selon le cas {@code fileContent} ou {@code storageRef}).
     */
    void store(CandidateNoteAttachment attachment, byte[] content);

    /**
     * Recupere le contenu binaire de la piece jointe pour consultation/telechargement.
     */
    byte[] retrieve(CandidateNoteAttachment attachment);

    /**
     * Supprime le contenu binaire sous-jacent (best-effort). La suppression logique de
     * l'entite (deleted_at) reste de la responsabilite du service appelant - cette methode
     * ne fait que liberer la ressource physique si pertinent pour le mode de stockage.
     */
    void delete(CandidateNoteAttachment attachment);
}
