package com.aerixa.app.infrastructure.candidates.repository;

import com.aerixa.app.domain.candidates.entity.CandidateApplication;
import com.aerixa.app.domain.candidates.entity.CandidateApplicationStatus;
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

    Optional<CandidateApplication> findByIdAndEstablishmentId(UUID id, UUID establishmentId);

    boolean existsByCandidateIdAndProgramTrackLevelId(UUID candidateId, UUID programTrackLevelId);

    List<CandidateApplication> findAllByEstablishmentIdAndCandidateIdAndIdNotAndStatus(
            UUID establishmentId, UUID candidateId, UUID id, CandidateApplicationStatus status);
}
