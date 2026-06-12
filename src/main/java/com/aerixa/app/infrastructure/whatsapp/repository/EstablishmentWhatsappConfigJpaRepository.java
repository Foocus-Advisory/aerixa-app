package com.aerixa.app.infrastructure.whatsapp.repository;

import com.aerixa.app.domain.whatsapp.entity.EstablishmentWhatsappConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface EstablishmentWhatsappConfigJpaRepository extends JpaRepository<EstablishmentWhatsappConfig, UUID> {

    Optional<EstablishmentWhatsappConfig> findByEstablishmentId(UUID establishmentId);

    Optional<EstablishmentWhatsappConfig> findByPhoneNumberId(String phoneNumberId);
}
