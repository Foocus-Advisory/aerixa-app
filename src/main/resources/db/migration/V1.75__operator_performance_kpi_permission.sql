-- V1.75__operator_performance_kpi_permission.sql
-- Nouvelle permission permettant a ADMIN/SUPER_ADMIN de consulter les KPI de performance
-- des operateurs de leurs etablissements (GET /establishments/{id}/operator-performance).

INSERT INTO auth.permissions (name, description, module, action)
SELECT 'candidates:read_operator_performance', 'Consulter les KPI de performance des operateurs', 'candidates', 'read_operator_performance'
WHERE NOT EXISTS (
    SELECT 1 FROM auth.permissions p
    WHERE p.name = 'candidates:read_operator_performance' AND p.deleted_at IS NULL
);

INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name IN ('SUPER_ADMIN', 'ADMIN')
  AND p.name = 'candidates:read_operator_performance'
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
