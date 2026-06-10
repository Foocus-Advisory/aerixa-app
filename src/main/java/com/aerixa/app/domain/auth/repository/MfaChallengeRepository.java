package com.aerixa.app.domain.auth.repository;

import com.aerixa.app.domain.auth.entity.MfaChallenge;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface MfaChallengeRepository {
    MfaChallenge save(MfaChallenge challenge);
    Optional<MfaChallenge> findById(UUID id);
    void deleteExpired(LocalDateTime now);
}
