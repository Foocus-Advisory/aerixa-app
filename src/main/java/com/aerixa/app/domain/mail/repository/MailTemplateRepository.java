package com.aerixa.app.domain.mail.repository;

import com.aerixa.app.domain.mail.entity.MailTemplate;
import com.aerixa.app.domain.mail.entity.MailType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MailTemplateRepository extends JpaRepository<MailTemplate, UUID> {
    @Query("SELECT m FROM MailTemplate m WHERE m.mailType = :mailType AND m.isCurrent = true AND m.language = :language")
    Optional<MailTemplate> findCurrentByMailTypeAndLanguage(MailType mailType, String language);

    @Query("SELECT m FROM MailTemplate m WHERE m.mailType = :mailType ORDER BY m.createdAt DESC")
    List<MailTemplate> findAllByMailType(MailType mailType);

    @Query("SELECT m FROM MailTemplate m WHERE m.mailType = :mailType AND m.isCurrent = true")
    List<MailTemplate> findCurrentVersionsByMailType(MailType mailType);

    @Query("SELECT m FROM MailTemplate m WHERE m.mailType.id = :mailTypeId ORDER BY m.versionNumber DESC")
    List<MailTemplate> findAllVersionsByMailTypeId(UUID mailTypeId);

    @Query("SELECT m FROM MailTemplate m WHERE m.mailType.id = :mailTypeId AND m.isCurrent = true")
    Optional<MailTemplate> findCurrentByMailTypeId(UUID mailTypeId);

    @Query("SELECT COUNT(m) FROM MailTemplate m WHERE m.mailType = :mailType")
    long countByMailType(MailType mailType);
}
