package com.aerixa.app.application.whatsapp.security;

import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.exception.PermissionDeniedException;
import com.aerixa.app.domain.configuration.entity.Establishment;
import com.aerixa.app.infrastructure.configuration.repository.EstablishmentJpaRepository;
import com.aerixa.app.infrastructure.error.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

/**
 * Regle de confidentialite dediee au module des conversations WhatsApp candidats,
 * derogeant au modele RBAC standard de Configuration.
 *
 * <p>Contrairement aux autres ressources de Configuration ou SUPER_ADMIN a une visibilite
 * globale sur tous les etablissements, ce module restreint SUPER_ADMIN aux seuls
 * etablissements qu'il a lui-meme crees ({@code establishments.created_by_user_id}),
 * au meme titre qu'ADMIN.
 *
 * <p>Voir {@code docs/security/rbac/CANDIDATE_CONVERSATIONS_VISIBILITY.md} pour la
 * justification de cette derogation.
 */
@Service
@RequiredArgsConstructor
public class ConversationVisibilityService {

    private final EstablishmentJpaRepository establishmentJpaRepository;

    /**
     * Verifie que l'acteur peut acceder aux conversations de l'etablissement donne.
     * Leve {@link ResourceNotFoundException} si l'etablissement n'existe pas, ou
     * {@link PermissionDeniedException} si l'acteur n'en est pas le createur.
     */
    public Establishment assertCanAccessEstablishment(User actor, UUID establishmentId) {
        Establishment establishment = establishmentJpaRepository.findById(establishmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Etablissement introuvable"));

        if (!actor.getId().equals(establishment.getCreatedByUserId())) {
            throw new PermissionDeniedException("candidate_conversations:scope");
        }

        return establishment;
    }

    /** Liste des identifiants d'etablissements visibles par l'acteur pour ce module. */
    public List<UUID> visibleEstablishmentIds(User actor) {
        return establishmentJpaRepository.findAllByCreatedByUserId(actor.getId(), Sort.unsorted())
                .stream()
                .map(Establishment::getId)
                .toList();
    }
}
