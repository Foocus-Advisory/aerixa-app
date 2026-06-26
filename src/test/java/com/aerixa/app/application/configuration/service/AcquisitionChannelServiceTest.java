package com.aerixa.app.application.configuration.service;

import com.aerixa.app.application.configuration.audit.ConfigurationAuditPublisher;
import com.aerixa.app.application.configuration.dto.AcquisitionChannelResponse;
import com.aerixa.app.application.configuration.dto.CreateAcquisitionChannelRequest;
import com.aerixa.app.application.configuration.dto.UpdateAcquisitionChannelRequest;
import com.aerixa.app.application.configuration.security.ConfigurationPermissionGuard;
import com.aerixa.app.application.configuration.security.EstablishmentAccessGuard;
import com.aerixa.app.domain.auth.entity.Role;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.domain.configuration.entity.AcquisitionChannel;
import com.aerixa.app.domain.configuration.entity.AcquisitionChannelType;
import com.aerixa.app.infrastructure.configuration.repository.AcquisitionChannelJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AcquisitionChannelServiceTest {

    @Mock
    private AcquisitionChannelJpaRepository acquisitionChannelJpaRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ConfigurationPermissionGuard permissionGuard;

    @Mock
    private EstablishmentAccessGuard establishmentAccessGuard;

    @Mock
    private ConfigurationAuditPublisher auditPublisher;

    @InjectMocks
    private AcquisitionChannelService acquisitionChannelService;

    private User admin;
    private UUID establishmentId;

    @BeforeEach
    void setUp() {
        establishmentId = UUID.randomUUID();
        admin = User.builder().roles(Set.of(Role.builder().name("ADMIN").permissions(Set.of()).build())).build();
        admin.setId(UUID.randomUUID());
    }

    @Test
    void createShouldRejectMissingType() {
        CreateAcquisitionChannelRequest request = CreateAcquisitionChannelRequest.builder()
                .establishmentId(establishmentId)
                .code("WEB")
                .name("Website")
                .build();

        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());

        assertThrows(IllegalArgumentException.class,
                () -> acquisitionChannelService.create(admin.getId(), request, "corr-ac-1"));
    }

    @Test
    void createShouldPersistAcquisitionChannel() {
        CreateAcquisitionChannelRequest request = CreateAcquisitionChannelRequest.builder()
                .establishmentId(establishmentId)
                .code("web")
                .name("Website")
                .type(AcquisitionChannelType.DIRECT)
                .build();

        AcquisitionChannel saved = AcquisitionChannel.builder()
                .id(UUID.randomUUID())
                .establishmentId(establishmentId)
                .code("WEB")
                .name("Website")
                .type(AcquisitionChannelType.DIRECT)
                .active(true)
                .build();

        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
        when(acquisitionChannelJpaRepository.existsByEstablishmentIdAndCodeIgnoreCase(establishmentId, "WEB")).thenReturn(false);
        when(acquisitionChannelJpaRepository.save(any(AcquisitionChannel.class))).thenReturn(saved);

        AcquisitionChannelResponse response = acquisitionChannelService.create(admin.getId(), request, "corr-ac-2");

        assertEquals("WEB", response.getCode());
        assertEquals(AcquisitionChannelType.DIRECT, response.getType());
    }

    @Test
    void listShouldReturnScopedAcquisitionChannels() {
        AcquisitionChannel channel = AcquisitionChannel.builder()
                .id(UUID.randomUUID())
                .establishmentId(establishmentId)
                .code("WEB")
                .name("Website")
                .type(AcquisitionChannelType.DIRECT)
                .active(true)
                .build();

        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
        when(acquisitionChannelJpaRepository.findAllByEstablishmentId(any(UUID.class), any(org.springframework.data.domain.Sort.class)))
                .thenReturn(List.of(channel));

        List<AcquisitionChannelResponse> response = acquisitionChannelService.list(admin.getId(), establishmentId, "corr-ac-3");

        assertEquals(1, response.size());
    }

    @Test
    void updateShouldChangeNameAndType() {
        UUID channelId = UUID.randomUUID();
        AcquisitionChannel channel = AcquisitionChannel.builder()
                .id(channelId)
                .establishmentId(establishmentId)
                .code("WEB")
                .name("Old")
                .type(AcquisitionChannelType.DIRECT)
                .active(true)
                .build();

        UpdateAcquisitionChannelRequest request = UpdateAcquisitionChannelRequest.builder()
                .name("New")
                .type(AcquisitionChannelType.INDIRECT)
                .build();

        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        doNothing().when(permissionGuard).assertHasPermission(any(User.class), anyString());
        when(acquisitionChannelJpaRepository.findByIdAndEstablishmentId(channelId, establishmentId)).thenReturn(Optional.of(channel));
        when(acquisitionChannelJpaRepository.save(any(AcquisitionChannel.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AcquisitionChannelResponse response = acquisitionChannelService.update(admin.getId(), establishmentId, channelId, request, "corr-ac-4");

        assertEquals("New", response.getName());
        assertEquals(AcquisitionChannelType.INDIRECT, response.getType());
    }
}
