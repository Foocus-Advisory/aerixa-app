package com.aerixa.app.infrastructure.candidates.repository;

import com.aerixa.app.domain.candidates.entity.Candidate;
import com.aerixa.app.domain.candidates.entity.CandidateStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CandidateJpaRepository extends JpaRepository<Candidate, UUID> {

    List<Candidate> findAllByEstablishmentId(UUID establishmentId, Sort sort);

    Optional<Candidate> findByIdAndEstablishmentId(UUID id, UUID establishmentId);

    @Query("SELECT c FROM Candidate c WHERE c.establishmentId = :establishmentId "
            + "AND (c.createdByUserId = :operatorId OR c.assignedOperatorId = :operatorId)")
    List<Candidate> findVisibleToOperator(@Param("establishmentId") UUID establishmentId,
                                           @Param("operatorId") UUID operatorId, Sort sort);

    @Query("SELECT c FROM Candidate c WHERE c.establishmentId = :establishmentId "
            + "AND (:status IS NULL OR c.status = :status) "
            + "AND (:search IS NULL OR LOWER(c.firstName) LIKE :search OR LOWER(c.lastName) LIKE :search OR LOWER(c.email) LIKE :search)")
    Page<Candidate> searchAllByEstablishmentId(@Param("establishmentId") UUID establishmentId,
                                                @Param("status") CandidateStatus status,
                                                @Param("search") String search,
                                                Pageable pageable);

    @Query("SELECT c FROM Candidate c WHERE c.establishmentId = :establishmentId "
            + "AND (c.createdByUserId = :operatorId OR c.assignedOperatorId = :operatorId) "
            + "AND (:status IS NULL OR c.status = :status) "
            + "AND (:search IS NULL OR LOWER(c.firstName) LIKE :search OR LOWER(c.lastName) LIKE :search OR LOWER(c.email) LIKE :search)")
    Page<Candidate> searchVisibleToOperator(@Param("establishmentId") UUID establishmentId,
                                             @Param("operatorId") UUID operatorId,
                                             @Param("status") CandidateStatus status,
                                             @Param("search") String search,
                                             Pageable pageable);

    @Query(value = "SELECT * FROM auth.candidates "
            + "WHERE establishment_id = :establishmentId "
            + "AND deleted_at IS NULL "
            + "AND (candidate_phone = :phoneNumber OR parent_phone_1 = :phoneNumber OR parent_phone_2 = :phoneNumber) "
            + "ORDER BY created_at ASC "
            + "LIMIT 1",
            nativeQuery = true)
    Optional<Candidate> findFirstByEstablishmentIdAndAnyPhoneNumber(@Param("establishmentId") UUID establishmentId,
                                                                     @Param("phoneNumber") String phoneNumber);

    @Modifying
    @Query(value = "DELETE FROM auth.candidates WHERE id = :id AND establishment_id = :establishmentId", nativeQuery = true)
    void hardDeleteByIdAndEstablishmentId(@Param("id") UUID id, @Param("establishmentId") UUID establishmentId);
}
