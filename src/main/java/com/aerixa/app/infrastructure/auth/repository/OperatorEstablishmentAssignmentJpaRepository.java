package com.aerixa.app.infrastructure.auth.repository;

import com.aerixa.app.domain.auth.entity.OperatorEstablishmentAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OperatorEstablishmentAssignmentJpaRepository extends JpaRepository<OperatorEstablishmentAssignment, UUID> {

    List<OperatorEstablishmentAssignment> findAllByOperatorUserId(UUID operatorUserId);

    List<OperatorEstablishmentAssignment> findAllByEstablishmentId(UUID establishmentId);

    boolean existsByOperatorUserIdAndEstablishmentId(UUID operatorUserId, UUID establishmentId);

    Optional<OperatorEstablishmentAssignment> findByOperatorUserIdAndEstablishmentId(UUID operatorUserId, UUID establishmentId);

    @Query("SELECT a.establishmentId FROM OperatorEstablishmentAssignment a WHERE a.operatorUserId = :operatorUserId")
    List<UUID> findEstablishmentIdsByOperatorUserId(@Param("operatorUserId") UUID operatorUserId);
}
