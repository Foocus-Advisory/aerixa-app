package com.aerixa.app.application.candidates.service;

import com.aerixa.app.application.candidates.dto.CandidateImportResultResponse;
import com.aerixa.app.application.candidates.dto.CandidateResponse;
import com.aerixa.app.application.candidates.dto.CreateCandidateRequest;
import com.aerixa.app.application.candidates.dto.EligibleProgramTrackLevelResponse;
import com.aerixa.app.application.candidates.dto.UpdateCandidateRequest;
import com.aerixa.app.application.candidates.security.CandidatesPermissions;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditAction;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEntityType;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEvent;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditOutcome;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditPublisher;
import com.aerixa.app.application.configuration.security.ConfigurationPermissionGuard;
import com.aerixa.app.application.configuration.security.EstablishmentAccessGuard;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.exception.PermissionDeniedException;
import com.aerixa.app.domain.auth.exception.UserNotFoundException;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.domain.candidates.entity.Candidate;
import com.aerixa.app.domain.candidates.entity.CandidateGender;
import com.aerixa.app.domain.candidates.entity.CandidateStatus;
import com.aerixa.app.domain.candidates.entity.WhatsappTarget;
import com.aerixa.app.domain.configuration.entity.AcademicLevel;
import com.aerixa.app.domain.configuration.entity.AcquisitionChannel;
import com.aerixa.app.domain.configuration.entity.Establishment;
import com.aerixa.app.domain.configuration.entity.EntryDiploma;
import com.aerixa.app.domain.configuration.entity.ProgramTrack;
import com.aerixa.app.domain.configuration.entity.ProgramTrackLevel;
import com.aerixa.app.infrastructure.auth.repository.OperatorEstablishmentAssignmentJpaRepository;
import com.aerixa.app.infrastructure.candidates.repository.CandidateJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.AcademicLevelJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.AcquisitionChannelJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.EntryDiplomaJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.EstablishmentJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.ProgramTrackJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.ProgramTrackLevelJpaRepository;
import com.aerixa.app.infrastructure.error.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CandidateService {

    private final CandidateJpaRepository candidateJpaRepository;
    private final EstablishmentJpaRepository establishmentJpaRepository;
    private final AcquisitionChannelJpaRepository acquisitionChannelJpaRepository;
    private final EntryDiplomaJpaRepository entryDiplomaJpaRepository;
    private final ProgramTrackLevelJpaRepository programTrackLevelJpaRepository;
    private final AcademicLevelJpaRepository academicLevelJpaRepository;
    private final ProgramTrackJpaRepository programTrackJpaRepository;
    private final UserRepository userRepository;
    private final ConfigurationPermissionGuard permissionGuard;
    private final ConfigurationAuditPublisher auditPublisher;
    private final EstablishmentAccessGuard establishmentAccessGuard;
    private final OperatorEstablishmentAssignmentJpaRepository operatorEstablishmentAssignmentJpaRepository;

    @Transactional
    public CandidateResponse create(UUID actorUserId, CreateCandidateRequest request, String correlationId) {
        User actor = actor(actorUserId);
        permissionGuard.assertHasPermission(actor, CandidatesPermissions.CANDIDATES_CREATE);

        try {
            UUID establishmentId = validateCreateRequest(request);
            assertEstablishmentAccess(actor, establishmentId);

            AcquisitionChannel acquisitionChannel = acquisitionChannelJpaRepository
                    .findByIdAndEstablishmentId(request.getAcquisitionChannelId(), establishmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Canal d'acquisition introuvable"));
            EntryDiploma entryDiploma = entryDiplomaJpaRepository
                    .findByIdAndEstablishmentId(request.getEntryDiplomaId(), establishmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Diplome d'entree introuvable"));

            Candidate saved = candidateJpaRepository.save(Candidate.builder()
                    .establishmentId(establishmentId)
                    .firstName(request.getFirstName())
                    .lastName(request.getLastName())
                    .parentPhone1(request.getParentPhone1())
                    .parentPhone2(request.getParentPhone2())
                    .candidatePhone(request.getCandidatePhone())
                    .email(request.getEmail())
                    .acquisitionChannelId(acquisitionChannel.getId())
                    .entryDiplomaId(entryDiploma.getId())
                    .previousSchool(request.getPreviousSchool())
                    .addressLine(request.getAddressLine())
                    .city(request.getCity())
                    .country(request.getCountry())
                    .dateOfBirth(request.getDateOfBirth())
                    .gender(request.getGender())
                    .observations(request.getObservations())
                    .preferredWhatsappTarget(request.getPreferredWhatsappTarget() != null
                            ? request.getPreferredWhatsappTarget() : WhatsappTarget.CANDIDATE)
                    .status(CandidateStatus.ACTIVE)
                    .assignedOperatorId(isOperatorOnly(actor) ? actor.getId() : null)
                    .createdByUserId(actor.getId())
                    .createdByLabel(actor.getEmail())
                    .build());

            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.CREATE, saved.getId(), correlationId,
                    Map.of("after", toMap(saved)));
            return toResponse(saved);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), request == null ? null : request.getEstablishmentId(), ConfigurationAuditAction.CREATE,
                    null, correlationId, "CANDIDATE_CREATE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    public List<CandidateResponse> list(UUID actorUserId, UUID establishmentId, String correlationId) {
        User actor = actor(actorUserId);
        permissionGuard.assertHasPermission(actor, CandidatesPermissions.CANDIDATES_LIST);
        assertEstablishmentAccess(actor, establishmentId);

        Sort sort = Sort.by(Sort.Direction.ASC, "lastName", "firstName");
        List<Candidate> items = isOperatorOnly(actor)
                ? candidateJpaRepository.findVisibleToOperator(establishmentId, actor.getId(), sort)
                : candidateJpaRepository.findAllByEstablishmentId(establishmentId, sort);
        publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.LIST, null, correlationId,
                Map.of("count", items.size()));
        return items.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public CandidateResponse getById(UUID actorUserId, UUID establishmentId, UUID candidateId, String correlationId) {
        User actor = actor(actorUserId);
        permissionGuard.assertHasPermission(actor, CandidatesPermissions.CANDIDATES_READ);
        assertEstablishmentAccess(actor, establishmentId);

        Candidate item = resolveScoped(actor, candidateId, establishmentId);
        publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.READ, item.getId(), correlationId, Map.of());
        return toResponse(item);
    }

    @Transactional
    public CandidateResponse update(UUID actorUserId, UUID establishmentId, UUID candidateId,
                                     UpdateCandidateRequest request, String correlationId) {
        User actor = actor(actorUserId);
        permissionGuard.assertHasPermission(actor, CandidatesPermissions.CANDIDATES_UPDATE);
        assertEstablishmentAccess(actor, establishmentId);

        Candidate item = resolveScoped(actor, candidateId, establishmentId);

        try {
            if (request == null) {
                throw new IllegalArgumentException("La requete de mise a jour est obligatoire");
            }
            Map<String, Object> before = toMap(item);

            if (request.getFirstName() != null) {
                item.setFirstName(request.getFirstName());
            }
            if (request.getLastName() != null) {
                item.setLastName(request.getLastName());
            }
            if (request.getParentPhone1() != null) {
                item.setParentPhone1(request.getParentPhone1());
            }
            if (request.getParentPhone2() != null) {
                item.setParentPhone2(request.getParentPhone2());
            }
            if (request.getCandidatePhone() != null) {
                if (request.getCandidatePhone().isBlank()) {
                    throw new IllegalArgumentException("candidatePhone est obligatoire");
                }
                item.setCandidatePhone(request.getCandidatePhone());
            }
            if (request.getEmail() != null) {
                item.setEmail(request.getEmail());
            }
            if (request.getAcquisitionChannelId() != null) {
                AcquisitionChannel acquisitionChannel = acquisitionChannelJpaRepository
                        .findByIdAndEstablishmentId(request.getAcquisitionChannelId(), establishmentId)
                        .orElseThrow(() -> new ResourceNotFoundException("Canal d'acquisition introuvable"));
                item.setAcquisitionChannelId(acquisitionChannel.getId());
            }
            if (request.getEntryDiplomaId() != null) {
                EntryDiploma entryDiploma = entryDiplomaJpaRepository
                        .findByIdAndEstablishmentId(request.getEntryDiplomaId(), establishmentId)
                        .orElseThrow(() -> new ResourceNotFoundException("Diplome d'entree introuvable"));
                item.setEntryDiplomaId(entryDiploma.getId());
            }
            if (request.getPreviousSchool() != null) {
                item.setPreviousSchool(request.getPreviousSchool());
            }
            if (request.getAddressLine() != null) {
                item.setAddressLine(request.getAddressLine());
            }
            if (request.getCity() != null) {
                item.setCity(request.getCity());
            }
            if (request.getCountry() != null) {
                item.setCountry(request.getCountry());
            }
            if (request.getDateOfBirth() != null) {
                item.setDateOfBirth(request.getDateOfBirth());
            }
            if (request.getGender() != null) {
                item.setGender(request.getGender());
            }
            if (request.getObservations() != null) {
                item.setObservations(request.getObservations());
            }
            if (request.getPreferredWhatsappTarget() != null) {
                item.setPreferredWhatsappTarget(request.getPreferredWhatsappTarget());
            }
            if (request.getAssignedOperatorId() != null
                    && !request.getAssignedOperatorId().equals(item.getAssignedOperatorId())) {
                permissionGuard.assertHasPermission(actor, CandidatesPermissions.CANDIDATES_ASSIGN_OPERATOR);
                if (!operatorEstablishmentAssignmentJpaRepository
                        .existsByOperatorUserIdAndEstablishmentId(request.getAssignedOperatorId(), establishmentId)) {
                    throw new IllegalArgumentException("L'operateur cible n'est pas affecte a cet etablissement");
                }
                item.setAssignedOperatorId(request.getAssignedOperatorId());
            }

            item.setUpdatedByUserId(actor.getId());
            item.setUpdatedByLabel(actor.getEmail());

            Candidate saved = candidateJpaRepository.save(item);
            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.UPDATE, saved.getId(), correlationId,
                    Map.of("before", before, "after", toMap(saved)));
            return toResponse(saved);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, ConfigurationAuditAction.UPDATE, candidateId, correlationId,
                    "CANDIDATE_UPDATE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional
    public void delete(UUID actorUserId, UUID establishmentId, UUID candidateId, String correlationId) {
        User actor = actor(actorUserId);
        permissionGuard.assertHasPermission(actor, CandidatesPermissions.CANDIDATES_DELETE);
        assertEstablishmentAccess(actor, establishmentId);

        Candidate item = resolveScoped(actor, candidateId, establishmentId);

        try {
            Map<String, Object> before = toMap(item);
            candidateJpaRepository.delete(item);
            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.DELETE, candidateId, correlationId,
                    Map.of("before", before));
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, ConfigurationAuditAction.DELETE, candidateId, correlationId,
                    "CANDIDATE_DELETE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional
    public void hardDelete(UUID actorUserId, UUID establishmentId, UUID candidateId, String correlationId) {
        User actor = actor(actorUserId);
        permissionGuard.assertHasPermission(actor, CandidatesPermissions.CANDIDATES_HARD_DELETE);
        assertEstablishmentAccess(actor, establishmentId);

        resolveScoped(actor, candidateId, establishmentId);

        try {
            candidateJpaRepository.hardDeleteByIdAndEstablishmentId(candidateId, establishmentId);
            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.HARD_DELETE, candidateId, correlationId,
                    Map.of("action", "hard_delete"));
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, ConfigurationAuditAction.HARD_DELETE, candidateId, correlationId,
                    "CANDIDATE_HARD_DELETE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional
    public CandidateResponse activate(UUID actorUserId, UUID establishmentId, UUID candidateId, String correlationId) {
        return changeStatus(actorUserId, establishmentId, candidateId, CandidateStatus.ACTIVE,
                CandidatesPermissions.CANDIDATES_ACTIVATE, ConfigurationAuditAction.ACTIVATE, correlationId);
    }

    @Transactional
    public CandidateResponse deactivate(UUID actorUserId, UUID establishmentId, UUID candidateId, String correlationId) {
        return changeStatus(actorUserId, establishmentId, candidateId, CandidateStatus.ARCHIVED,
                CandidatesPermissions.CANDIDATES_DEACTIVATE, ConfigurationAuditAction.DEACTIVATE, correlationId);
    }

    @Transactional(readOnly = true)
    public List<EligibleProgramTrackLevelResponse> listEligibleProgramTrackLevels(UUID actorUserId, UUID establishmentId,
                                                                                   UUID candidateId, String correlationId) {
        User actor = actor(actorUserId);
        permissionGuard.assertHasPermission(actor, CandidatesPermissions.CANDIDATES_READ);
        assertEstablishmentAccess(actor, establishmentId);

        Candidate candidate = resolveScoped(actor, candidateId, establishmentId);
        EntryDiploma entryDiploma = entryDiplomaJpaRepository.findByIdAndEstablishmentId(candidate.getEntryDiplomaId(), establishmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Diplome d'entree introuvable"));

        List<ProgramTrackLevel> eligible = programTrackLevelJpaRepository
                .findEligibleByEstablishmentIdAndMaxRankOrder(establishmentId, entryDiploma.getRankOrder());

        publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.LIST, candidate.getId(), correlationId,
                Map.of("count", eligible.size(), "context", "eligible_program_track_levels"));

        return eligible.stream().map(ptl -> {
            AcademicLevel academicLevel = academicLevelJpaRepository.findByIdAndEstablishmentId(ptl.getAcademicLevelId(), establishmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Niveau academique introuvable"));
            ProgramTrack programTrack = programTrackJpaRepository.findByIdAndEstablishmentId(ptl.getProgramTrackId(), establishmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Filiere introuvable"));
            return EligibleProgramTrackLevelResponse.builder()
                    .programTrackLevelId(ptl.getId())
                    .programTrackId(programTrack.getId())
                    .programTrackName(programTrack.getName())
                    .academicLevelId(academicLevel.getId())
                    .academicLevelLabel(academicLevel.getLabel())
                    .academicLevelRankOrder(academicLevel.getRankOrder())
                    .build();
        }).toList();
    }

    @Transactional(readOnly = true)
    public byte[] exportToExcel(UUID actorUserId, UUID establishmentId, String correlationId) {
        User actor = actor(actorUserId);
        permissionGuard.assertHasPermission(actor, CandidatesPermissions.CANDIDATES_EXPORT);
        assertEstablishmentAccess(actor, establishmentId);

        Sort exportSort = Sort.by(Sort.Direction.ASC, "lastName", "firstName");
        List<Candidate> items = isOperatorOnly(actor)
                ? candidateJpaRepository.findVisibleToOperator(establishmentId, actor.getId(), exportSort)
                : candidateJpaRepository.findAllByEstablishmentId(establishmentId, exportSort);

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("candidates");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("firstName");
            header.createCell(1).setCellValue("lastName");
            header.createCell(2).setCellValue("candidatePhone");
            header.createCell(3).setCellValue("parentPhone1");
            header.createCell(4).setCellValue("parentPhone2");
            header.createCell(5).setCellValue("email");
            header.createCell(6).setCellValue("acquisitionChannelCode");
            header.createCell(7).setCellValue("entryDiplomaCode");
            header.createCell(8).setCellValue("previousSchool");
            header.createCell(9).setCellValue("addressLine");
            header.createCell(10).setCellValue("city");
            header.createCell(11).setCellValue("country");
            header.createCell(12).setCellValue("dateOfBirth");
            header.createCell(13).setCellValue("gender");
            header.createCell(14).setCellValue("preferredWhatsappTarget");
            header.createCell(15).setCellValue("status");
            header.createCell(16).setCellValue("observations");
            header.createCell(17).setCellValue("createdAt");

            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            int rowIndex = 1;
            for (Candidate item : items) {
                Row row = sheet.createRow(rowIndex++);
                row.createCell(0).setCellValue(item.getFirstName());
                row.createCell(1).setCellValue(item.getLastName());
                row.createCell(2).setCellValue(item.getCandidatePhone());
                row.createCell(3).setCellValue(item.getParentPhone1() == null ? "" : item.getParentPhone1());
                row.createCell(4).setCellValue(item.getParentPhone2() == null ? "" : item.getParentPhone2());
                row.createCell(5).setCellValue(item.getEmail() == null ? "" : item.getEmail());
                row.createCell(6).setCellValue(acquisitionChannelJpaRepository.findById(item.getAcquisitionChannelId())
                        .map(AcquisitionChannel::getCode).orElse(""));
                row.createCell(7).setCellValue(entryDiplomaJpaRepository.findById(item.getEntryDiplomaId())
                        .map(EntryDiploma::getCode).orElse(""));
                row.createCell(8).setCellValue(item.getPreviousSchool() == null ? "" : item.getPreviousSchool());
                row.createCell(9).setCellValue(item.getAddressLine() == null ? "" : item.getAddressLine());
                row.createCell(10).setCellValue(item.getCity() == null ? "" : item.getCity());
                row.createCell(11).setCellValue(item.getCountry() == null ? "" : item.getCountry());
                row.createCell(12).setCellValue(item.getDateOfBirth() == null ? "" : item.getDateOfBirth().toString());
                row.createCell(13).setCellValue(item.getGender() == null ? "" : item.getGender().name());
                row.createCell(14).setCellValue(item.getPreferredWhatsappTarget().name());
                row.createCell(15).setCellValue(item.getStatus().name());
                row.createCell(16).setCellValue(item.getObservations() == null ? "" : item.getObservations());
                row.createCell(17).setCellValue(item.getCreatedAt() != null ? formatter.format(item.getCreatedAt()) : "");
            }

            for (int i = 0; i <= 17; i++) sheet.autoSizeColumn(i);
            workbook.write(out);

            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.EXPORT, null, correlationId,
                    Map.of("count", items.size()));
            return out.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Impossible de generer l'export Excel des candidats", ex);
        }
    }

    @Transactional(readOnly = true)
    public byte[] generateImportTemplate() {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("import-candidates");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("firstName*");
            header.createCell(1).setCellValue("lastName*");
            header.createCell(2).setCellValue("candidatePhone*");
            header.createCell(3).setCellValue("acquisitionChannelCode*");
            header.createCell(4).setCellValue("entryDiplomaCode*");
            header.createCell(5).setCellValue("parentPhone1");
            header.createCell(6).setCellValue("parentPhone2");
            header.createCell(7).setCellValue("email");
            header.createCell(8).setCellValue("previousSchool");
            header.createCell(9).setCellValue("addressLine");
            header.createCell(10).setCellValue("city");
            header.createCell(11).setCellValue("country");
            header.createCell(12).setCellValue("dateOfBirth");
            header.createCell(13).setCellValue("gender");
            header.createCell(14).setCellValue("preferredWhatsappTarget");
            header.createCell(15).setCellValue("observations");

            Row sample = sheet.createRow(1);
            sample.createCell(0).setCellValue("Jean");
            sample.createCell(1).setCellValue("Dupont");
            sample.createCell(2).setCellValue("+237600000000");
            sample.createCell(3).setCellValue("WEB");
            sample.createCell(4).setCellValue("BAC");
            sample.createCell(5).setCellValue("+237611111111");
            sample.createCell(6).setCellValue("");
            sample.createCell(7).setCellValue("jean.dupont@example.com");
            sample.createCell(8).setCellValue("Lycee XYZ");
            sample.createCell(9).setCellValue("Quartier ABC");
            sample.createCell(10).setCellValue("Douala");
            sample.createCell(11).setCellValue("Cameroun");
            sample.createCell(12).setCellValue("2005-01-15");
            sample.createCell(13).setCellValue("MALE");
            sample.createCell(14).setCellValue("CANDIDATE");
            sample.createCell(15).setCellValue("");

            Sheet meta = workbook.createSheet("metadata");
            meta.createRow(0).createCell(0).setCellValue("firstName: prenom du candidat (obligatoire)");
            meta.createRow(1).createCell(0).setCellValue("lastName: nom du candidat (obligatoire)");
            meta.createRow(2).createCell(0).setCellValue("candidatePhone: numero de telephone du candidat (obligatoire)");
            meta.createRow(3).createCell(0).setCellValue("acquisitionChannelCode: code du canal d'acquisition existant (obligatoire)");
            meta.createRow(4).createCell(0).setCellValue("entryDiplomaCode: code du diplome d'entree existant (obligatoire)");
            meta.createRow(5).createCell(0).setCellValue("parentPhone1, parentPhone2: numeros des parents (optionnel)");
            meta.createRow(6).createCell(0).setCellValue("email: adresse email du candidat (optionnel)");
            meta.createRow(7).createCell(0).setCellValue("previousSchool, addressLine, city, country: informations complementaires (optionnel)");
            meta.createRow(8).createCell(0).setCellValue("dateOfBirth: date de naissance au format yyyy-MM-dd (optionnel)");
            meta.createRow(9).createCell(0).setCellValue("gender: MALE, FEMALE ou UNSPECIFIED (optionnel, defaut UNSPECIFIED)");
            meta.createRow(10).createCell(0).setCellValue("preferredWhatsappTarget: PARENT_1, PARENT_2 ou CANDIDATE (optionnel, defaut CANDIDATE)");
            meta.createRow(11).createCell(0).setCellValue("observations: notes libres (optionnel)");

            for (int i = 0; i <= 15; i++) sheet.autoSizeColumn(i);
            meta.autoSizeColumn(0);

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Impossible de generer le template d'import Excel", ex);
        }
    }

    @Transactional
    public CandidateImportResultResponse importFromExcel(
            UUID actorUserId, UUID establishmentId, MultipartFile file, String correlationId) {
        User actor = actor(actorUserId);
        permissionGuard.assertHasPermission(actor, CandidatesPermissions.CANDIDATES_IMPORT);
        assertEstablishmentAccess(actor, establishmentId);

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Le fichier d'import est vide");
        }

        DataFormatter formatter = new DataFormatter();
        int totalRows = 0;
        int created = 0;
        List<String> errors = new ArrayList<>();

        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                String firstName = readCell(row, 0, formatter).trim();
                String lastName = readCell(row, 1, formatter).trim();
                String candidatePhone = readCell(row, 2, formatter).trim();
                String acquisitionChannelCode = readCell(row, 3, formatter).trim();
                String entryDiplomaCode = readCell(row, 4, formatter).trim();
                String parentPhone1 = readCell(row, 5, formatter).trim();
                String parentPhone2 = readCell(row, 6, formatter).trim();
                String email = readCell(row, 7, formatter).trim();
                String previousSchool = readCell(row, 8, formatter).trim();
                String addressLine = readCell(row, 9, formatter).trim();
                String city = readCell(row, 10, formatter).trim();
                String country = readCell(row, 11, formatter).trim();
                String dateOfBirthRaw = readCell(row, 12, formatter).trim();
                String genderRaw = readCell(row, 13, formatter).trim().toUpperCase();
                String whatsappTargetRaw = readCell(row, 14, formatter).trim().toUpperCase();
                String observations = readCell(row, 15, formatter).trim();

                if (firstName.isEmpty() && lastName.isEmpty() && candidatePhone.isEmpty()
                        && acquisitionChannelCode.isEmpty() && entryDiplomaCode.isEmpty()) {
                    continue;
                }
                totalRows++;

                try {
                    if (firstName.isEmpty()) throw new IllegalArgumentException("firstName obligatoire");
                    if (lastName.isEmpty()) throw new IllegalArgumentException("lastName obligatoire");
                    if (candidatePhone.isEmpty()) throw new IllegalArgumentException("candidatePhone obligatoire");

                    AcquisitionChannel acquisitionChannel = acquisitionChannelJpaRepository
                            .findByEstablishmentIdAndCodeIgnoreCase(establishmentId, acquisitionChannelCode)
                            .orElseThrow(() -> new IllegalArgumentException("acquisitionChannelCode inconnu: " + acquisitionChannelCode));
                    EntryDiploma entryDiploma = entryDiplomaJpaRepository
                            .findByEstablishmentIdAndCodeIgnoreCase(establishmentId, entryDiplomaCode)
                            .orElseThrow(() -> new IllegalArgumentException("entryDiplomaCode inconnu: " + entryDiplomaCode));

                    LocalDate dateOfBirth = null;
                    if (!dateOfBirthRaw.isEmpty()) {
                        try {
                            dateOfBirth = LocalDate.parse(dateOfBirthRaw);
                        } catch (Exception ex) {
                            throw new IllegalArgumentException("dateOfBirth invalide (format attendu yyyy-MM-dd)");
                        }
                    }

                    CandidateGender gender = CandidateGender.UNSPECIFIED;
                    if (!genderRaw.isEmpty()) {
                        try {
                            gender = CandidateGender.valueOf(genderRaw);
                        } catch (IllegalArgumentException ex) {
                            throw new IllegalArgumentException("gender invalide (MALE, FEMALE ou UNSPECIFIED attendu)");
                        }
                    }

                    WhatsappTarget whatsappTarget = WhatsappTarget.CANDIDATE;
                    if (!whatsappTargetRaw.isEmpty()) {
                        try {
                            whatsappTarget = WhatsappTarget.valueOf(whatsappTargetRaw);
                        } catch (IllegalArgumentException ex) {
                            throw new IllegalArgumentException("preferredWhatsappTarget invalide (PARENT_1, PARENT_2 ou CANDIDATE attendu)");
                        }
                    }

                    candidateJpaRepository.save(Candidate.builder()
                            .establishmentId(establishmentId)
                            .firstName(firstName)
                            .lastName(lastName)
                            .candidatePhone(candidatePhone)
                            .parentPhone1(parentPhone1.isEmpty() ? null : parentPhone1)
                            .parentPhone2(parentPhone2.isEmpty() ? null : parentPhone2)
                            .email(email.isEmpty() ? null : email)
                            .acquisitionChannelId(acquisitionChannel.getId())
                            .entryDiplomaId(entryDiploma.getId())
                            .previousSchool(previousSchool.isEmpty() ? null : previousSchool)
                            .addressLine(addressLine.isEmpty() ? null : addressLine)
                            .city(city.isEmpty() ? null : city)
                            .country(country.isEmpty() ? null : country)
                            .dateOfBirth(dateOfBirth)
                            .gender(gender)
                            .observations(observations.isEmpty() ? null : observations)
                            .preferredWhatsappTarget(whatsappTarget)
                            .status(CandidateStatus.ACTIVE)
                            .createdByUserId(actor.getId())
                            .createdByLabel(actor.getEmail())
                            .build());
                    created++;
                } catch (Exception ex) {
                    errors.add("Ligne " + (i + 1) + ": " + ex.getMessage());
                }
            }
        } catch (IOException ex) {
            throw new IllegalStateException("Impossible de lire le fichier d'import", ex);
        }

        publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.IMPORT, null, correlationId,
                Map.of("totalRows", totalRows, "created", created, "failed", errors.size()));

        return CandidateImportResultResponse.builder()
                .totalRows(totalRows)
                .created(created)
                .failed(errors.size())
                .errors(errors)
                .build();
    }

    private String readCell(Row row, int index, DataFormatter formatter) {
        org.apache.poi.ss.usermodel.Cell cell = row.getCell(index);
        return cell == null ? "" : formatter.formatCellValue(cell);
    }

    private CandidateResponse changeStatus(UUID actorUserId, UUID establishmentId, UUID candidateId, CandidateStatus status,
                                            String permission, ConfigurationAuditAction action, String correlationId) {
        User actor = actor(actorUserId);
        permissionGuard.assertHasPermission(actor, permission);
        assertEstablishmentAccess(actor, establishmentId);

        Candidate item = resolveScoped(actor, candidateId, establishmentId);
        try {
            CandidateStatus before = item.getStatus();
            item.setStatus(status);
            item.setUpdatedByUserId(actor.getId());
            item.setUpdatedByLabel(actor.getEmail());
            Candidate saved = candidateJpaRepository.save(item);

            publishSuccess(actor.getId(), establishmentId, action, saved.getId(), correlationId,
                    Map.of("before", Map.of("status", before.name()), "after", Map.of("status", saved.getStatus().name())));
            return toResponse(saved);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, action, candidateId, correlationId,
                    status == CandidateStatus.ACTIVE ? "CANDIDATE_ACTIVATE_FAILED" : "CANDIDATE_DEACTIVATE_FAILED", ex);
            throw ex;
        }
    }

    private UUID validateCreateRequest(CreateCandidateRequest request) {
        if (request == null || request.getEstablishmentId() == null) {
            throw new IllegalArgumentException("L'etablissement est obligatoire");
        }
        if (request.getFirstName() == null || request.getFirstName().isBlank()) {
            throw new IllegalArgumentException("Le prenom est obligatoire");
        }
        if (request.getLastName() == null || request.getLastName().isBlank()) {
            throw new IllegalArgumentException("Le nom est obligatoire");
        }
        if (request.getCandidatePhone() == null || request.getCandidatePhone().isBlank()) {
            throw new IllegalArgumentException("Le numero du candidat est obligatoire");
        }
        if (request.getAcquisitionChannelId() == null) {
            throw new IllegalArgumentException("Le canal d'acquisition est obligatoire");
        }
        if (request.getEntryDiplomaId() == null) {
            throw new IllegalArgumentException("Le diplome d'entree est obligatoire");
        }
        return request.getEstablishmentId();
    }

    private Candidate resolveScoped(User actor, UUID candidateId, UUID establishmentId) {
        Candidate candidate = candidateJpaRepository.findByIdAndEstablishmentId(candidateId, establishmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidat introuvable"));

        if (isOperatorOnly(actor)
                && !actor.getId().equals(candidate.getCreatedByUserId())
                && !actor.getId().equals(candidate.getAssignedOperatorId())) {
            throw new ResourceNotFoundException("Candidat introuvable");
        }

        return candidate;
    }

    private void assertEstablishmentAccess(User actor, UUID establishmentId) {
        establishmentAccessGuard.assertAccess(actor, establishmentId);
    }

    private boolean isOperatorOnly(User actor) {
        return actor.hasRole("OPERATOR") && !actor.hasRole("ADMIN") && !actor.hasRole("SUPER_ADMIN");
    }

    private User actor(UUID actorUserId) {
        return userRepository.findById(actorUserId)
                .orElseThrow(() -> new UserNotFoundException(actorUserId));
    }

    private CandidateResponse toResponse(Candidate item) {
        return CandidateResponse.builder()
                .id(item.getId())
                .establishmentId(item.getEstablishmentId())
                .firstName(item.getFirstName())
                .lastName(item.getLastName())
                .parentPhone1(item.getParentPhone1())
                .parentPhone2(item.getParentPhone2())
                .candidatePhone(item.getCandidatePhone())
                .email(item.getEmail())
                .acquisitionChannelId(item.getAcquisitionChannelId())
                .entryDiplomaId(item.getEntryDiplomaId())
                .previousSchool(item.getPreviousSchool())
                .addressLine(item.getAddressLine())
                .city(item.getCity())
                .country(item.getCountry())
                .dateOfBirth(item.getDateOfBirth())
                .gender(item.getGender())
                .observations(item.getObservations())
                .preferredWhatsappTarget(item.getPreferredWhatsappTarget())
                .status(item.getStatus())
                .assignedOperatorId(item.getAssignedOperatorId())
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .createdByUserId(item.getCreatedByUserId())
                .createdByLabel(item.getCreatedByLabel())
                .updatedByUserId(item.getUpdatedByUserId())
                .updatedByLabel(item.getUpdatedByLabel())
                .build();
    }

    private Map<String, Object> toMap(Candidate item) {
        return Map.of(
                "id", item.getId() == null ? "" : item.getId().toString(),
                "establishmentId", item.getEstablishmentId().toString(),
                "firstName", item.getFirstName(),
                "lastName", item.getLastName(),
                "candidatePhone", item.getCandidatePhone(),
                "status", item.getStatus().name()
        );
    }

    private void publishSuccess(UUID actorId, UUID establishmentId, ConfigurationAuditAction action, UUID entityId,
                                 String correlationId, Map<String, Object> payloadDiff) {
        auditPublisher.publish(ConfigurationAuditEvent.builder()
                .actorId(actorId)
                .establishmentId(establishmentId)
                .action(action)
                .entityType(ConfigurationAuditEntityType.CANDIDATE)
                .entityId(entityId)
                .correlationId(normalizeCorrelationId(correlationId))
                .outcome(ConfigurationAuditOutcome.SUCCESS)
                .payloadDiff(payloadDiff)
                .build());
    }

    private void publishFailure(UUID actorId, UUID establishmentId, ConfigurationAuditAction action, UUID entityId,
                                 String correlationId, String reasonCode, RuntimeException ex) {
        auditPublisher.publish(ConfigurationAuditEvent.builder()
                .actorId(actorId)
                .establishmentId(establishmentId == null ? UUID.fromString("00000000-0000-0000-0000-000000000000") : establishmentId)
                .action(action)
                .entityType(ConfigurationAuditEntityType.CANDIDATE)
                .entityId(entityId)
                .correlationId(normalizeCorrelationId(correlationId))
                .outcome(ConfigurationAuditOutcome.FAILURE)
                .reasonCode(reasonCode)
                .errorMessage(ex.getMessage())
                .payloadDiff(Map.of())
                .build());
    }

    private String normalizeCorrelationId(String correlationId) {
        return correlationId == null || correlationId.isBlank() ? UUID.randomUUID().toString() : correlationId.trim();
    }
}
