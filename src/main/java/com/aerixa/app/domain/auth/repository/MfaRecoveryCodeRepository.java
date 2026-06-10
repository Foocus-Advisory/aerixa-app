package com.aerixa.app.domain.auth.repository;

import com.aerixa.app.domain.auth.entity.MfaRecoveryCode;

import java.util.List;
import java.util.UUID;

public interface MfaRecoveryCodeRepository {
    List<MfaRecoveryCode> saveAllCodes(List<MfaRecoveryCode> recoveryCodes);
    void deleteByUserId(UUID userId);
}
