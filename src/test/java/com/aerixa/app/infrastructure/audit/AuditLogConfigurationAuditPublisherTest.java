package com.aerixa.app.infrastructure.audit;

import com.aerixa.app.application.configuration.audit.ConfigurationAuditAction;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEntityType;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEvent;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditOutcome;
import com.aerixa.app.domain.auth.entity.AuditLog;
import com.aerixa.app.domain.auth.entity.Role;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.repository.AuditLogRepository;
import com.aerixa.app.domain.auth.repository.UserRepository;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuditLogConfigurationAuditPublisherTest {

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private UserRepository userRepository;

    private AuditLogConfigurationAuditPublisher publisher;

    @BeforeEach
    void setUp() {
        this.publisher = new AuditLogConfigurationAuditPublisher(auditLogRepository, userRepository, new ObjectMapper());
    }

    @Test
    void publishShouldPersistMappedAuditLog() {
        UUID actorId = UUID.randomUUID();
        UUID establishmentId = UUID.randomUUID();
        UUID entityId = UUID.randomUUID();

        User actor = User.builder()
                .email("admin@aerixa.com")
                .roles(Set.of(Role.builder().name("ADMIN").build()))
                .build();
        actor.setId(actorId);

        ConfigurationAuditEvent event = ConfigurationAuditEvent.builder()
                .actorId(actorId)
                .establishmentId(establishmentId)
                .action(ConfigurationAuditAction.CREATE)
                .entityType(ConfigurationAuditEntityType.ESTABLISHMENT)
                .entityId(entityId)
                .correlationId("corr-123")
                .outcome(ConfigurationAuditOutcome.SUCCESS)
                .payloadDiff(Map.of("after", Map.of("name", "Ecole 1")))
                .build();

        when(userRepository.findById(actorId)).thenReturn(Optional.of(actor));
        when(auditLogRepository.save(org.mockito.ArgumentMatchers.any(AuditLog.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        publisher.publish(event);

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());

        AuditLog saved = captor.getValue();
        assertEquals(AuditLog.AuditAction.CREATE, saved.getAction());
        assertEquals("ESTABLISHMENT", saved.getEntityType());
        assertEquals(entityId, saved.getEntityId());
        assertEquals("corr-123", saved.getCorrelationId());
        assertEquals(AuditLog.AuditOutcome.SUCCESS, saved.getOutcome());
        assertTrue(saved.getDetails().contains(establishmentId.toString()));
    }

    @Test
    void publishShouldRejectMissingMandatoryFields() {
        ConfigurationAuditEvent invalid = ConfigurationAuditEvent.builder()
                .action(ConfigurationAuditAction.UPDATE)
                .entityType(ConfigurationAuditEntityType.ENTRY_DIPLOMA)
                .build();

        assertThrows(IllegalArgumentException.class, () -> publisher.publish(invalid));
    }

    @Test
    void publishShouldFailClosedWhenAuditPersistenceFails() {
        UUID actorId = UUID.randomUUID();
        UUID establishmentId = UUID.randomUUID();

        User actor = User.builder()
                .email("admin@aerixa.com")
                .roles(Set.of(Role.builder().name("ADMIN").build()))
                .build();
        actor.setId(actorId);

        ConfigurationAuditEvent event = ConfigurationAuditEvent.builder()
                .actorId(actorId)
                .establishmentId(establishmentId)
                .action(ConfigurationAuditAction.UPDATE)
                .entityType(ConfigurationAuditEntityType.ACADEMIC_LEVEL)
                .correlationId("corr-fail-closed")
                .outcome(ConfigurationAuditOutcome.FAILURE)
                .payloadDiff(Map.of())
                .build();

        when(userRepository.findById(actorId)).thenReturn(Optional.of(actor));
        when(auditLogRepository.save(any(AuditLog.class))).thenThrow(new RuntimeException("db unavailable"));

        assertThrows(IllegalStateException.class, () -> publisher.publish(event));
    }
}
