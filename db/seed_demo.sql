-- Demo users
INSERT INTO users (id, email, full_name, password_hash)
VALUES
  ('cuser00000000000000000002', 'manager@fsm.local', 'Demo Manager', crypt('Manager123!', gen_salt('bf', 12))),
  ('cuser00000000000000000003', 'tech@fsm.local', 'Demo Technician', crypt('Tech12345!', gen_salt('bf', 12))),
  ('cuser00000000000000000004', 'accountant@fsm.local', 'Demo Accountant', crypt('Account123!', gen_salt('bf', 12)))
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 'cuser00000000000000000002', id FROM roles WHERE name = 'MANAGER'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 'cuser00000000000000000003', id FROM roles WHERE name = 'TECHNICIAN'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 'cuser00000000000000000004', id FROM roles WHERE name = 'ACCOUNTANT'
ON CONFLICT DO NOTHING;

-- Demo service requests
INSERT INTO service_requests (id, requestor_name, contact_info, building, area, urgency, description, status)
VALUES
  (
    'cdemosr000000000000000001',
    'Acme Plant',
    'ops@acme.local',
    'HQ',
    'Electrical Room',
    'HIGH',
    'Cooling unit not maintaining temperature',
    'SUBMITTED'
  ),
  (
    'cdemosr000000000000000002',
    'North Warehouse',
    'warehouse@north.local',
    'Warehouse',
    'Dock 1',
    'MEDIUM',
    'Dock door sensor intermittent fault',
    'SUBMITTED'
  )
ON CONFLICT (id) DO NOTHING;

-- Demo work orders
INSERT INTO work_orders (id, title, description, status, lead_technician_id)
VALUES
  ('cdemowo000000000000000001', 'Inspect Cooling Unit', 'Initial diagnostic and maintenance check', 'IN_PROGRESS', 'cuser00000000000000000003'),
  ('cdemowo000000000000000002', 'Replace Dock Sensor', 'Replace failed sensor and test wiring continuity', 'ASSIGNED', 'cuser00000000000000000003')
ON CONFLICT (id) DO NOTHING;

-- Demo labor
INSERT INTO labor_entries (id, work_order_id, technician_id, hours, entry_type, entry_date)
VALUES
  ('cdemolab00000000000000001', 'cdemowo000000000000000001', 'cuser00000000000000000003', 2.50, 'WORK_ORDER', CURRENT_DATE),
  ('cdemolab00000000000000002', NULL, 'cuser00000000000000000003', 1.00, 'TRAINING', CURRENT_DATE)
ON CONFLICT (id) DO NOTHING;
