package com.aerixa.app.infrastructure.auth.repository;

import com.aerixa.app.domain.auth.entity.MfaRecoveryCode;
import com.aerixa.app.domain.auth.repository.MfaRecoveryCodeRepository;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MfaRecoveryCodeJpaRepository extends JpaRepository<MfaRecoveryCode, UUID>, MfaRecoveryCodeRepository {

    @Override
    default List<MfaRecoveryCode> saveAllCodes(List<MfaRecoveryCode> recoveryCodes) {
        return saveAll(recoveryCodes);
    }

    @Override
    @Transactional
    @Modifying
    @Query("DELETE FROM MfaRecoveryCode c WHERE c.user.id = :userId")
    void deleteByUserId(@Param("userId") UUID userId);
}
