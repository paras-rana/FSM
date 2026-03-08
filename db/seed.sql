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

INSERT INTO role_page_access (role_id, page_key)
SELECT r.id, v.page_key
FROM roles r
JOIN (
  VALUES
    ('ADMIN', 'dashboard'),
    ('ADMIN', 'work-orders'),
    ('ADMIN', 'service-requests'),
    ('ADMIN', 'timesheet'),
    ('ADMIN', 'costs'),
    ('ADMIN', 'reports'),
    ('ADMIN', 'theme-templates'),
    ('ADMIN', 'facilities'),
    ('ADMIN', 'attachments'),
    ('ADMIN', 'notifications'),
    ('ADMIN', 'admin-users'),
    ('MANAGER', 'dashboard'),
    ('MANAGER', 'work-orders'),
    ('MANAGER', 'service-requests'),
    ('MANAGER', 'reports'),
    ('MANAGER', 'attachments'),
    ('MANAGER', 'notifications'),
    ('TECHNICIAN', 'dashboard'),
    ('TECHNICIAN', 'work-orders'),
    ('TECHNICIAN', 'service-requests'),
    ('TECHNICIAN', 'timesheet'),
    ('TECHNICIAN', 'attachments'),
    ('TECHNICIAN', 'notifications'),
    ('ACCOUNTANT', 'dashboard'),
    ('ACCOUNTANT', 'costs'),
    ('ACCOUNTANT', 'reports'),
    ('ACCOUNTANT', 'attachments'),
    ('ACCOUNTANT', 'notifications')
) AS v(role_name, page_key) ON v.role_name = r.name
ON CONFLICT DO NOTHING;

INSERT INTO facilities (id, name, address, city, zipcode, contact_info)
VALUES (
  'cfac000000000000000000001',
  'HQ',
  '100 Main St',
  'Springfield',
  '90001',
  'Front Desk: (555) 010-1000'
)
ON CONFLICT (name) DO NOTHING;

INSERT INTO facility_zones (id, facility_id, name)
VALUES
  ('cfz0000000000000000000001', 'cfac000000000000000000001', 'Front Desk'),
  ('cfz0000000000000000000002', 'cfac000000000000000000001', 'Restroom'),
  ('cfz0000000000000000000003', 'cfac000000000000000000001', 'Conference Room'),
  ('cfz0000000000000000000004', 'cfac000000000000000000001', 'Electrical Room')
ON CONFLICT (facility_id, name) DO NOTHING;
