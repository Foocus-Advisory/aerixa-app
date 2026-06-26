package com.aerixa.app.infrastructure.notification.repository;

import com.aerixa.app.domain.notification.entity.NotificationJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface NotificationJobJpaRepository extends JpaRepository<NotificationJob, UUID> {

    @Query(value = "SELECT * FROM auth.notification_jobs "
            + "WHERE status = 'PENDING' AND next_attempt_at <= :now "
            + "ORDER BY next_attempt_at ASC "
            + "LIMIT :batchSize "
            + "FOR UPDATE SKIP LOCKED",
            nativeQuery = true)
    List<NotificationJob> lockNextBatch(@Param("now") LocalDateTime now, @Param("batchSize") int batchSize);
}
