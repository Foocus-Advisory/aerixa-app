package com.aerixa.app.infrastructure.auth.repository;

import com.aerixa.app.domain.auth.entity.AuditLog;
import com.aerixa.app.domain.auth.repository.AuditLogRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AuditLogJpaRepository extends JpaRepository<AuditLog, UUID>, AuditLogRepository {
}
