package com.aerixa.app.infrastructure.auth.repository;

import com.aerixa.app.domain.auth.entity.MfaChallenge;
import com.aerixa.app.domain.auth.repository.MfaChallengeRepository;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.UUID;

@Repository
public interface MfaChallengeJpaRepository extends JpaRepository<MfaChallenge, UUID>, MfaChallengeRepository {

    @Override
    @Transactional
    @Modifying
    @Query("DELETE FROM MfaChallenge c WHERE c.expiresAt < :now")
    void deleteExpired(@Param("now") LocalDateTime now);
}
