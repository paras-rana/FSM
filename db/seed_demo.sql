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

INSERT INTO facilities (id, name, address, city, zipcode, contact_info)
VALUES
  (
    'cfac000000000000000000003',
    'North Campus',
    '1100 North Campus Dr',
    'Springfield',
    '90011',
    'Operations: (555) 010-3001'
  ),
  (
    'cfac000000000000000000004',
    'South Plant',
    '2200 South Plant Rd',
    'Springfield',
    '90012',
    'Plant Supervisor: (555) 010-3002'
  ),
  (
    'cfac000000000000000000005',
    'West Clinic',
    '3300 West Health Blvd',
    'Springfield',
    '90013',
    'Front Office: (555) 010-3003'
  ),
  (
    'cfac000000000000000000006',
    'East Office',
    '4400 East Office Park',
    'Springfield',
    '90014',
    'Admin Desk: (555) 010-3004'
  ),
  (
    'cfac000000000000000000007',
    'Central Warehouse',
    '5500 Central Logistics Way',
    'Springfield',
    '90015',
    'Warehouse Office: (555) 010-3005'
  )
ON CONFLICT (name) DO NOTHING;

INSERT INTO facility_zones (id, facility_id, name)
VALUES
  ('cfz0000000000000000000010', 'cfac000000000000000000003', 'Main Lobby'),
  ('cfz0000000000000000000011', 'cfac000000000000000000003', 'Front Desk'),
  ('cfz0000000000000000000012', 'cfac000000000000000000003', 'Conference Room A'),
  ('cfz0000000000000000000013', 'cfac000000000000000000003', 'Restroom'),
  ('cfz0000000000000000000014', 'cfac000000000000000000004', 'Line 1'),
  ('cfz0000000000000000000015', 'cfac000000000000000000004', 'Line 2'),
  ('cfz0000000000000000000016', 'cfac000000000000000000004', 'Control Room'),
  ('cfz0000000000000000000017', 'cfac000000000000000000004', 'Maintenance Bay'),
  ('cfz0000000000000000000018', 'cfac000000000000000000005', 'Reception'),
  ('cfz0000000000000000000019', 'cfac000000000000000000005', 'Exam Room 1'),
  ('cfz0000000000000000000020', 'cfac000000000000000000005', 'Exam Room 2'),
  ('cfz0000000000000000000021', 'cfac000000000000000000005', 'Nurse Station'),
  ('cfz0000000000000000000022', 'cfac000000000000000000006', 'Office Floor'),
  ('cfz0000000000000000000023', 'cfac000000000000000000006', 'Break Room'),
  ('cfz0000000000000000000024', 'cfac000000000000000000006', 'Training Room'),
  ('cfz0000000000000000000025', 'cfac000000000000000000006', 'Restroom'),
  ('cfz0000000000000000000026', 'cfac000000000000000000007', 'Dock 1'),
  ('cfz0000000000000000000027', 'cfac000000000000000000007', 'Dock 2'),
  ('cfz0000000000000000000028', 'cfac000000000000000000007', 'Storage Aisle'),
  ('cfz0000000000000000000029', 'cfac000000000000000000007', 'Packing Zone')
ON CONFLICT (facility_id, name) DO NOTHING;

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
