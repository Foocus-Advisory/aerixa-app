package com.aerixa.app.infrastructure.candidates.repository;

import com.aerixa.app.domain.candidates.entity.CandidateApplication;
import com.aerixa.app.domain.candidates.entity.CandidateApplicationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CandidateApplicationJpaRepository extends JpaRepository<CandidateApplication, UUID> {

    List<CandidateApplication> findAllByEstablishmentIdAndCandidateId(UUID establishmentId, UUID candidateId, Sort sort);

    List<CandidateApplication> findAllByEstablishmentId(UUID establishmentId, Sort sort);

    @Query("SELECT a FROM CandidateApplication a, Candidate c "
            + "WHERE a.candidateId = c.id AND a.establishmentId = :establishmentId "
            + "AND (c.createdByUserId = :operatorId OR c.assignedOperatorId = :operatorId)")
    List<CandidateApplication> findVisibleToOperatorByEstablishment(@Param("establishmentId") UUID establishmentId,
                                                                      @Param("operatorId") UUID operatorId, Sort sort);

    @Query("SELECT a FROM CandidateApplication a WHERE a.establishmentId = :establishmentId "
            + "AND (:status IS NULL OR a.status = :status) "
            + "AND (:funnelStageId IS NULL OR a.currentStageId = :funnelStageId)")
    Page<CandidateApplication> searchAllByEstablishmentId(@Param("establishmentId") UUID establishmentId,
                                                           @Param("status") CandidateApplicationStatus status,
                                                           @Param("funnelStageId") UUID funnelStageId,
                                                           Pageable pageable);

    @Query("SELECT a FROM CandidateApplication a, Candidate c "
            + "WHERE a.candidateId = c.id AND a.establishmentId = :establishmentId "
            + "AND (c.createdByUserId = :operatorId OR c.assignedOperatorId = :operatorId OR a.assignedOperatorId = :operatorId) "
            + "AND (:status IS NULL OR a.status = :status) "
            + "AND (:funnelStageId IS NULL OR a.currentStageId = :funnelStageId)")
    Page<CandidateApplication> searchVisibleToOperatorByEstablishment(@Param("establishmentId") UUID establishmentId,
                                                                       @Param("operatorId") UUID operatorId,
                                                                       @Param("status") CandidateApplicationStatus status,
                                                                       @Param("funnelStageId") UUID funnelStageId,
                                                                       Pageable pageable);

    Optional<CandidateApplication> findByIdAndEstablishmentId(UUID id, UUID establishmentId);

    boolean existsByCandidateIdAndProgramTrackLevelId(UUID candidateId, UUID programTrackLevelId);

    List<CandidateApplication> findAllByEstablishmentIdAndCandidateIdAndIdNotAndStatus(
            UUID establishmentId, UUID candidateId, UUID id, CandidateApplicationStatus status);
}
