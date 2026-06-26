-- V1.70__candidate_operator_assignment.sql
-- Permet a un ADMIN de reaffecter un candidat a un OPERATOR precis (gestion fine au sein
-- d'un etablissement deja affecte). L'OPERATOR ne voit alors que les candidats qu'il a
-- crees ou qui lui ont ete affectes (cf. EstablishmentAccessGuard pour le niveau
-- etablissement, ce ticket ajoute le niveau candidat).

ALTER TABLE auth.candidates
    ADD COLUMN IF NOT EXISTS assigned_operator_id UUID NULL;

ALTER TABLE auth.candidates
    ADD CONSTRAINT fk_candidates_assigned_operator
        FOREIGN KEY (assigned_operator_id)
        REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_candidates_assigned_operator
    ON auth.candidates(assigned_operator_id);

-- Permission dediee a la reaffectation (ADMIN/SUPER_ADMIN uniquement, pas OPERATOR).
INSERT INTO auth.permissions (name, description, module, action)
SELECT v.name, v.description, v.module, v.action
FROM (VALUES
    ('candidates:assign_operator', 'Affecter un candidat a un operateur', 'candidates', 'assign_operator')
) AS v(name, description, module, action)
WHERE NOT EXISTS (
    SELECT 1 FROM auth.permissions p WHERE p.name = v.name
);

INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name IN ('SUPER_ADMIN', 'ADMIN')
  AND p.name = 'candidates:assign_operator'
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
