package com.aerixa.app.domain.auth.repository;

import com.aerixa.app.domain.auth.entity.AuditLog;
import java.util.UUID;

public interface AuditLogRepository {
    AuditLog save(AuditLog auditLog);
}
