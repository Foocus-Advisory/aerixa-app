package com.aerixa.app.domain.auth.repository;

import com.aerixa.app.domain.auth.entity.Session;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SessionRepository {
    Session save(Session session);
    Optional<Session> findById(UUID id);
    Optional<Session> findByAccessTokenHash(String hash);
    Optional<Session> findByRefreshTokenHash(String hash);
    Optional<Session> findByRefreshTokenHashForUpdate(String hash);
    Optional<Session> findActiveSessionByUserId(UUID userId);
    List<Session> findAllActiveSessionsByUserId(UUID userId);
    Page<Session> findAllForAdmin(
            UUID actorUserId,
            boolean canReadAll,
            UUID userId,
            String status,
            LocalDateTime startedFrom,
            LocalDateTime startedTo,
            String userQuery,
            Pageable pageable
    );
        List<Session> findAllForAdmin(
            UUID actorUserId,
            boolean canReadAll,
            UUID userId,
            String status,
            LocalDateTime startedFrom,
            LocalDateTime startedTo,
            String userQuery,
            Sort sort
        );
    void delete(Session session);
    void deleteAllExpiredSessions();
}
