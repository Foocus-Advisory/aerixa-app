-- V1.71__fix_operator_establishment_assignments_audit_columns.sql
-- OperatorEstablishmentAssignment herite de SoftDeletableEntity > AuditableEntity, qui exige
-- created_by_user_id/created_by_label/updated_by_user_id/updated_by_label. La migration
-- V1.69 avait omis ces colonnes (presentes sur toutes les autres tables suivant ce pattern,
-- ex. program_track_levels), causant un echec de validation du schema Hibernate au demarrage.

ALTER TABLE auth.operator_establishment_assignments
    ADD COLUMN IF NOT EXISTS created_by_user_id UUID NULL,
    ADD COLUMN IF NOT EXISTS created_by_label VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS updated_by_user_id UUID NULL,
    ADD COLUMN IF NOT EXISTS updated_by_label VARCHAR(255) NULL;
