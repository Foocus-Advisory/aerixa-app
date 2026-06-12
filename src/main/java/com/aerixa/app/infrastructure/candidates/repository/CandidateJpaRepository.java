package com.aerixa.app.infrastructure.candidates.repository;

import com.aerixa.app.domain.candidates.entity.Candidate;
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
