INSERT INTO roles (id, name) VALUES
  ('crole00000000000000000001', 'TECHNICIAN'),
  ('crole00000000000000000002', 'MANAGER'),
  ('crole00000000000000000003', 'ACCOUNTANT'),
  ('crole00000000000000000004', 'ADMIN')
ON CONFLICT (name) DO NOTHING;

INSERT INTO users (id, email, full_name, password_hash)
VALUES (
  'cuser00000000000000000001',
  'admin@fsm.local',
  'System Admin',
  crypt('Admin123!', gen_salt('bf', 12))
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 'cuser00000000000000000001', id
FROM roles
WHERE name = 'ADMIN'
ON CONFLICT DO NOTHING;
