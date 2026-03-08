-- Demo users
INSERT INTO users (id, email, full_name, password_hash)
VALUES
  ('cuser00000000000000000002', 'manager@fsm.local', 'Demo Manager', crypt('Manager123!', gen_salt('bf', 12))),
  ('cuser00000000000000000003', 'tech@fsm.local', 'Demo Technician', crypt('Tech12345!', gen_salt('bf', 12))),
  ('cuser00000000000000000004', 'accountant@fsm.local', 'Demo Accountant', crypt('Account123!', gen_salt('bf', 12))),
  ('cuser00000000000000000005', 'eric@fsm.local', 'Eric', crypt('Tech12345!', gen_salt('bf', 12))),
  ('cuser00000000000000000006', 'mike@fsm.local', 'Mike', crypt('Tech12345!', gen_salt('bf', 12))),
  ('cuser00000000000000000007', 'john@fsm.local', 'John', crypt('Tech12345!', gen_salt('bf', 12))),
  ('cuser00000000000000000008', 'bob@fsm.local', 'Bob', crypt('Tech12345!', gen_salt('bf', 12))),
  ('cuser00000000000000000009', 'joe@fsm.local', 'Joe', crypt('Tech12345!', gen_salt('bf', 12)))
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

INSERT INTO user_roles (user_id, role_id)
SELECT 'cuser00000000000000000005', id FROM roles WHERE name = 'TECHNICIAN'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 'cuser00000000000000000006', id FROM roles WHERE name = 'TECHNICIAN'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 'cuser00000000000000000007', id FROM roles WHERE name = 'TECHNICIAN'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 'cuser00000000000000000008', id FROM roles WHERE name = 'TECHNICIAN'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 'cuser00000000000000000009', id FROM roles WHERE name = 'TECHNICIAN'
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

-- 20 additional demo work orders randomly assigned to technicians
WITH tech_pool AS (
  SELECT ur.user_id AS technician_id
  FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE r.name = 'TECHNICIAN'
)
INSERT INTO work_orders (
  id,
  title,
  description,
  status,
  lead_technician_id,
  facility_name,
  zone_name,
  created_at,
  updated_at
)
SELECT
  'cdemowo' || lpad(gs::text, 18, '0') AS id,
  'Demo Work Order ' || gs AS title,
  'Auto-generated seeded work order #' || gs AS description,
  (ARRAY['CREATED', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_PARTS'])[1 + floor(random() * 4)::int] AS status,
  (SELECT technician_id FROM tech_pool ORDER BY random() LIMIT 1) AS lead_technician_id,
  (ARRAY['HQ', 'North Campus', 'South Plant', 'West Clinic', 'East Office', 'Central Warehouse'])[1 + floor(random() * 6)::int] AS facility_name,
  (ARRAY['Front Desk', 'Restroom', 'Conference Room', 'Electrical Room', 'Dock 1', 'Control Room'])[1 + floor(random() * 6)::int] AS zone_name,
  now() - ((3 + floor(random() * 45))::text || ' days')::interval AS created_at,
  now() - (floor(random() * 3)::text || ' days')::interval AS updated_at
FROM generate_series(101, 120) AS gs
ON CONFLICT (id) DO NOTHING;

-- Labor entries for generated work orders (2 per work order)
INSERT INTO labor_entries (
  id,
  work_order_id,
  technician_id,
  hours,
  entry_type,
  entry_date,
  created_at
)
SELECT
  'cdemolab' || lpad(gs::text, 17, '0') AS id,
  wo.id AS work_order_id,
  COALESCE(wo.lead_technician_id, 'cuser00000000000000000003') AS technician_id,
  round((1 + random() * 6)::numeric, 2) AS hours,
  'WORK_ORDER' AS entry_type,
  (CURRENT_DATE - (1 + floor(random() * 25))::int) AS entry_date,
  now() - (floor(random() * 12)::text || ' days')::interval AS created_at
FROM generate_series(101, 120) AS gs
JOIN work_orders wo ON wo.id = 'cdemowo' || lpad(gs::text, 18, '0')
ON CONFLICT (id) DO NOTHING;

INSERT INTO labor_entries (
  id,
  work_order_id,
  technician_id,
  hours,
  entry_type,
  entry_date,
  created_at
)
SELECT
  'cdemolab' || lpad((gs + 1000)::text, 17, '0') AS id,
  wo.id AS work_order_id,
  COALESCE(wo.lead_technician_id, 'cuser00000000000000000003') AS technician_id,
  round((0.5 + random() * 4)::numeric, 2) AS hours,
  'WORK_ORDER' AS entry_type,
  (CURRENT_DATE - floor(random() * 20)::int) AS entry_date,
  now() - (floor(random() * 10)::text || ' days')::interval AS created_at
FROM generate_series(101, 120) AS gs
JOIN work_orders wo ON wo.id = 'cdemowo' || lpad(gs::text, 18, '0')
ON CONFLICT (id) DO NOTHING;

-- Material costs for generated work orders
INSERT INTO materials (
  id,
  work_order_id,
  description,
  quantity,
  unit_cost,
  sales_tax_rate,
  subtotal,
  tax,
  total,
  created_by,
  created_at
)
SELECT
  m.id,
  m.work_order_id,
  m.description,
  m.quantity,
  m.unit_cost,
  m.sales_tax_rate,
  m.subtotal,
  m.tax,
  m.total,
  m.created_by,
  m.created_at
FROM (
  SELECT
    'cdemomat' || lpad(gs::text, 17, '0') AS id,
    wo.id AS work_order_id,
    'Material for WO-' || wo.wo_number AS description,
    c.quantity,
    c.unit_cost,
    0.0875::numeric AS sales_tax_rate,
    round(c.quantity * c.unit_cost, 2) AS subtotal,
    round(round(c.quantity * c.unit_cost, 2) * 0.0875, 2) AS tax,
    round(round(c.quantity * c.unit_cost, 2) + round(round(c.quantity * c.unit_cost, 2) * 0.0875, 2), 2) AS total,
    'cuser00000000000000000002' AS created_by,
    now() - (floor(random() * 9)::text || ' days')::interval AS created_at
  FROM generate_series(101, 120) AS gs
  JOIN work_orders wo ON wo.id = 'cdemowo' || lpad(gs::text, 18, '0')
  CROSS JOIN LATERAL (
    SELECT
      (1 + floor(random() * 5))::numeric AS quantity,
      round((15 + random() * 185)::numeric, 2) AS unit_cost
  ) AS c
) AS m
ON CONFLICT (id) DO NOTHING;

-- Vendor invoice costs for generated work orders
INSERT INTO vendor_invoices (
  id,
  work_order_id,
  vendor_name,
  invoice_number,
  amount,
  sales_tax_rate,
  subtotal,
  tax,
  total,
  created_by,
  created_at
)
SELECT
  v.id,
  v.work_order_id,
  v.vendor_name,
  v.invoice_number,
  v.amount,
  v.sales_tax_rate,
  v.subtotal,
  v.tax,
  v.total,
  v.created_by,
  v.created_at
FROM (
  SELECT
    'cdemovnd' || lpad(gs::text, 17, '0') AS id,
    wo.id AS work_order_id,
    (ARRAY['Acme Supplies', 'North Service Co', 'Prime Industrial', 'Rapid HVAC LLC'])[1 + floor(random() * 4)::int] AS vendor_name,
    'INV-' || gs AS invoice_number,
    c.amount,
    0.0875::numeric AS sales_tax_rate,
    c.amount AS subtotal,
    round(c.amount * 0.0875, 2) AS tax,
    round(c.amount + round(c.amount * 0.0875, 2), 2) AS total,
    'cuser00000000000000000002' AS created_by,
    now() - (floor(random() * 8)::text || ' days')::interval AS created_at
  FROM generate_series(101, 120) AS gs
  JOIN work_orders wo ON wo.id = 'cdemowo' || lpad(gs::text, 18, '0')
  CROSS JOIN LATERAL (
    SELECT round((80 + random() * 820)::numeric, 2) AS amount
  ) AS c
) AS v
ON CONFLICT (id) DO NOTHING;
