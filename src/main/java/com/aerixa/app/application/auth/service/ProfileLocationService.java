package com.aerixa.app.application.auth.service;

import com.aerixa.app.application.auth.dto.ProfileLocationCountryResponse;
import com.aerixa.app.infrastructure.auth.repository.ProfileCityJpaRepository;
import com.aerixa.app.infrastructure.auth.repository.ProfileCountryJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProfileLocationService {

        private final ProfileCountryJpaRepository profileCountryJpaRepository;
        private final ProfileCityJpaRepository profileCityJpaRepository;

    @Transactional(readOnly = true)
        public List<ProfileLocationCountryResponse> listCountriesWithCities() {
                return profileCountryJpaRepository.findAllByOrderByNameAsc().stream()
                .map(country -> ProfileLocationCountryResponse.builder()
                        .code(country.getCode())
                        .name(country.getName())
                                                .cities(profileCityJpaRepository.findAllByCountryIdOrderByNameAsc(country.getId()).stream()
                                .map(city -> city.getName())
                                .toList())
                        .build())
                .toList();
    }
}
