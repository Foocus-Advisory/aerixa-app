package com.aerixa.app.domain.mail.repository;

import com.aerixa.app.domain.mail.entity.MailType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MailTypeRepository extends JpaRepository<MailType, UUID> {
    Optional<MailType> findByCode(String code);

    Optional<MailType> findByCategory(String category);

    @Query("SELECT m FROM MailType m WHERE m.active = true ORDER BY m.name")
    List<MailType> findAllActive();

    boolean existsByCode(String code);

    boolean existsByCategory(String category);
}
