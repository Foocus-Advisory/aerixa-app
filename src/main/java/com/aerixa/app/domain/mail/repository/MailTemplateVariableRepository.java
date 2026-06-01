package com.aerixa.app.domain.mail.repository;

import com.aerixa.app.domain.mail.entity.MailTemplateVariable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MailTemplateVariableRepository extends JpaRepository<MailTemplateVariable, UUID> {
    Optional<MailTemplateVariable> findByCode(String code);

    @Query("SELECT v FROM MailTemplateVariable v WHERE v.active = true ORDER BY v.category, v.displayOrder, v.label")
    List<MailTemplateVariable> findAllActive();

    @Query("SELECT v FROM MailTemplateVariable v WHERE v.category = :category AND v.active = true ORDER BY v.displayOrder, v.label")
    List<MailTemplateVariable> findByCategory(String category);

    @Query("SELECT DISTINCT v.category FROM MailTemplateVariable v WHERE v.active = true ORDER BY v.category")
    List<String> findAllCategories();

    @Query("SELECT v FROM MailTemplateVariable v WHERE v.required = true AND v.active = true")
    List<MailTemplateVariable> findAllRequired();

    boolean existsByCode(String code);
}
