package com.aerixa.app.infrastructure.auth.repository;

import com.aerixa.app.domain.auth.entity.ProfileCity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProfileCityJpaRepository extends JpaRepository<ProfileCity, UUID> {
    List<ProfileCity> findAllByCountryIdOrderByNameAsc(UUID countryId);
}
