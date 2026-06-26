package com.aerixa.app.infrastructure.auth.repository;

import com.aerixa.app.domain.auth.entity.Session;
import com.aerixa.app.domain.auth.repository.SessionRepository;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SessionJpaRepository extends JpaRepository<Session, UUID>, SessionRepository {

    @Override
    Optional<Session> findByAccessTokenHash(String hash);

    @Override
    Optional<Session> findByRefreshTokenHash(String hash);

    @Override
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Session s WHERE s.refreshTokenHash = :hash")
    Optional<Session> findByRefreshTokenHashForUpdate(@Param("hash") String hash);

    @Override
    @Query("SELECT s FROM Session s WHERE s.user.id = :userId AND s.revokedAt IS NULL AND s.expiresAt > CURRENT_TIMESTAMP ORDER BY s.createdAt DESC")
    Optional<Session> findActiveSessionByUserId(@Param("userId") UUID userId);

    @Override
    @Query("SELECT s FROM Session s WHERE s.user.id = :userId AND s.revokedAt IS NULL AND s.expiresAt > CURRENT_TIMESTAMP ORDER BY s.createdAt DESC")
    List<Session> findAllActiveSessionsByUserId(@Param("userId") UUID userId);

    @Override
    @Query(value = """
                    SELECT s FROM Session s
                    LEFT JOIN s.user u
                    LEFT JOIN u.parentAdmin parentAdmin
                    WHERE (:userId IS NULL OR s.user.id = :userId)
                        AND (:canReadAll = true OR parentAdmin.id = :actorUserId OR s.user.id = :actorUserId)
                        AND s.createdAt >= :startedFrom
                        AND s.createdAt <= :startedTo
                        AND (
                            :userQuery IS NULL OR :userQuery = ''
                            OR LOWER(COALESCE(s.user.firstName, '')) LIKE LOWER(CONCAT('%', :userQuery, '%'))
                            OR LOWER(COALESCE(s.user.lastName, '')) LIKE LOWER(CONCAT('%', :userQuery, '%'))
                            OR LOWER(COALESCE(s.user.email, '')) LIKE LOWER(CONCAT('%', :userQuery, '%'))
                            OR LOWER(COALESCE(s.user.username, '')) LIKE LOWER(CONCAT('%', :userQuery, '%'))
                        )
                        AND (
                            :status IS NULL OR :status = '' OR :status = 'ALL'
                            OR (:status = 'ACTIVE' AND s.revokedAt IS NULL AND s.expiresAt > CURRENT_TIMESTAMP)
                            OR (:status = 'REVOKED' AND s.revokedAt IS NOT NULL)
                            OR (:status = 'EXPIRED' AND s.revokedAt IS NULL AND s.expiresAt <= CURRENT_TIMESTAMP)
                        )
                    """,
            countQuery = """
                    SELECT COUNT(s) FROM Session s
                    LEFT JOIN s.user u
                    LEFT JOIN u.parentAdmin parentAdmin
                    WHERE (:userId IS NULL OR s.user.id = :userId)
                        AND (:canReadAll = true OR parentAdmin.id = :actorUserId OR s.user.id = :actorUserId)
                        AND s.createdAt >= :startedFrom
                        AND s.createdAt <= :startedTo
                        AND (
                            :userQuery IS NULL OR :userQuery = ''
                            OR LOWER(COALESCE(s.user.firstName, '')) LIKE LOWER(CONCAT('%', :userQuery, '%'))
                            OR LOWER(COALESCE(s.user.lastName, '')) LIKE LOWER(CONCAT('%', :userQuery, '%'))
                            OR LOWER(COALESCE(s.user.email, '')) LIKE LOWER(CONCAT('%', :userQuery, '%'))
                            OR LOWER(COALESCE(s.user.username, '')) LIKE LOWER(CONCAT('%', :userQuery, '%'))
                        )
                        AND (
                            :status IS NULL OR :status = '' OR :status = 'ALL'
                            OR (:status = 'ACTIVE' AND s.revokedAt IS NULL AND s.expiresAt > CURRENT_TIMESTAMP)
                            OR (:status = 'REVOKED' AND s.revokedAt IS NOT NULL)
                            OR (:status = 'EXPIRED' AND s.revokedAt IS NULL AND s.expiresAt <= CURRENT_TIMESTAMP)
                        )
                    """)
    Page<Session> findAllForAdmin(
            @Param("actorUserId") UUID actorUserId,
            @Param("canReadAll") boolean canReadAll,
            @Param("userId") UUID userId,
            @Param("status") String status,
            @Param("startedFrom") LocalDateTime startedFrom,
            @Param("startedTo") LocalDateTime startedTo,
            @Param("userQuery") String userQuery,
            Pageable pageable
    );

    @Override
    @Query("""
            SELECT s FROM Session s
            LEFT JOIN s.user u
            LEFT JOIN u.parentAdmin parentAdmin
            WHERE (:userId IS NULL OR s.user.id = :userId)
                AND (:canReadAll = true OR parentAdmin.id = :actorUserId)
                AND s.createdAt >= :startedFrom
                AND s.createdAt <= :startedTo
                AND (
                    :userQuery IS NULL OR :userQuery = ''
                    OR LOWER(COALESCE(s.user.firstName, '')) LIKE LOWER(CONCAT('%', :userQuery, '%'))
                    OR LOWER(COALESCE(s.user.lastName, '')) LIKE LOWER(CONCAT('%', :userQuery, '%'))
                    OR LOWER(COALESCE(s.user.email, '')) LIKE LOWER(CONCAT('%', :userQuery, '%'))
                    OR LOWER(COALESCE(s.user.username, '')) LIKE LOWER(CONCAT('%', :userQuery, '%'))
                )
                AND (
                    :status IS NULL OR :status = '' OR :status = 'ALL'
                    OR (:status = 'ACTIVE' AND s.revokedAt IS NULL AND s.expiresAt > CURRENT_TIMESTAMP)
                    OR (:status = 'REVOKED' AND s.revokedAt IS NOT NULL)
                    OR (:status = 'EXPIRED' AND s.revokedAt IS NULL AND s.expiresAt <= CURRENT_TIMESTAMP)
                )
            """)
    List<Session> findAllForAdmin(
            @Param("actorUserId") UUID actorUserId,
            @Param("canReadAll") boolean canReadAll,
            @Param("userId") UUID userId,
            @Param("status") String status,
            @Param("startedFrom") LocalDateTime startedFrom,
            @Param("startedTo") LocalDateTime startedTo,
            @Param("userQuery") String userQuery,
            Sort sort
    );

    @Transactional
    @Modifying
    @Query("DELETE FROM Session s WHERE s.expiresAt < :now")
    void deleteAllExpiredSessions(@Param("now") LocalDateTime now);

    @Override
    default void deleteAllExpiredSessions() {
        deleteAllExpiredSessions(LocalDateTime.now());
    }
}
