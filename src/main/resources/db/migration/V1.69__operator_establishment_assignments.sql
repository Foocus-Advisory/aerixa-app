-- V1.69__operator_establishment_assignments.sql
-- Permet a un ADMIN d'affecter un ou plusieurs de ses etablissements a un OPERATOR qu'il a
-- cree. Cette affectation conditionne l'acces de l'OPERATOR aux candidats/candidatures de
-- ces etablissements (cf. EstablishmentAccessGuard).

CREATE TABLE IF NOT EXISTS auth.operator_establishment_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_user_id UUID NOT NULL,
    establishment_id UUID NOT NULL,
    assigned_by_user_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_oea_operator_user
        FOREIGN KEY (operator_user_id)
        REFERENCES auth.users(id),
    CONSTRAINT fk_oea_establishment
        FOREIGN KEY (establishment_id)
        REFERENCES auth.establishments(id),
    CONSTRAINT fk_oea_assigned_by_user
        FOREIGN KEY (assigned_by_user_id)
        REFERENCES auth.users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_oea_operator_establishment_active
    ON auth.operator_establishment_assignments(operator_user_id, establishment_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_oea_operator_user
    ON auth.operator_establishment_assignments(operator_user_id);

CREATE INDEX IF NOT EXISTS idx_oea_establishment
    ON auth.operator_establishment_assignments(establishment_id);

-- Permission de gestion des affectations (ADMIN/SUPER_ADMIN uniquement).
INSERT INTO auth.permissions (name, description, module, action)
SELECT v.name, v.description, v.module, v.action
FROM (VALUES
    ('operator_establishment_assignments:manage', 'Affecter des etablissements a un operateur', 'operator_establishment_assignments', 'manage')
) AS v(name, description, module, action)
WHERE NOT EXISTS (
    SELECT 1 FROM auth.permissions p WHERE p.name = v.name
);

INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name IN ('SUPER_ADMIN', 'ADMIN')
  AND p.name = 'operator_establishment_assignments:manage'
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- OPERATOR doit pouvoir lister/lire les etablissements qui lui sont affectes (necessaire
-- pour le selecteur d'etablissement cote UI candidats).
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name = 'OPERATOR'
  AND p.name IN ('establishments:list', 'establishments:read')
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
