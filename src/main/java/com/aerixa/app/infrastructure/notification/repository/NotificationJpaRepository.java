package com.aerixa.app.infrastructure.notification.repository;

import com.aerixa.app.domain.notification.entity.Notification;
import com.aerixa.app.domain.notification.repository.NotificationRepository;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NotificationJpaRepository extends JpaRepository<Notification, UUID>, NotificationRepository {

    @Query("SELECT n FROM Notification n WHERE n.user.id = :userId ORDER BY n.createdAt DESC")
    Page<Notification> findByUserId(@Param("userId") UUID userId, Pageable pageable);

    @Query("SELECT n FROM Notification n WHERE n.user.id = :userId AND n.read = :read ORDER BY n.createdAt DESC")
    Page<Notification> findByUserIdAndRead(@Param("userId") UUID userId, @Param("read") boolean read, Pageable pageable);

    @Query("SELECT n FROM Notification n WHERE n.id = :id AND n.user.id = :userId")
    Optional<Notification> findByIdAndUserId(@Param("id") UUID id, @Param("userId") UUID userId);

    @Query("SELECT COUNT(n) FROM Notification n WHERE n.user.id = :userId AND n.read = false")
    long countUnreadByUserId(@Param("userId") UUID userId);

    @Query("SELECT n FROM Notification n WHERE n.user.id = :userId AND n.id IN :ids")
    List<Notification> findAllByUserIdAndIdIn(@Param("userId") UUID userId, @Param("ids") List<UUID> ids);

    @Transactional
    @Modifying
    @Query("UPDATE Notification n SET n.read = :read, n.readAt = :readAt WHERE n.user.id = :userId AND n.id IN :ids")
    int updateReadStatusBulk(@Param("userId") UUID userId,
                             @Param("ids") List<UUID> ids,
                             @Param("read") boolean read,
                             @Param("readAt") LocalDateTime readAt);
}
