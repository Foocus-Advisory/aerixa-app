package com.aerixa.app.infrastructure.candidates.repository;

import com.aerixa.app.domain.candidates.entity.CandidateApplicationStageHistory;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CandidateApplicationStageHistoryJpaRepository extends JpaRepository<CandidateApplicationStageHistory, UUID> {

    List<CandidateApplicationStageHistory> findAllByCandidateApplicationId(UUID candidateApplicationId, Sort sort);
}
