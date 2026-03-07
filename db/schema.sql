CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(25) PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(25) PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS facilities (
  id VARCHAR(25) PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  zipcode TEXT NOT NULL DEFAULT '',
  contact_info TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS facility_zones (
  id VARCHAR(25) PRIMARY KEY,
  facility_id VARCHAR(25) NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (facility_id, name)
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id VARCHAR(25) NOT NULL REFERENCES users(id),
  role_id VARCHAR(25) NOT NULL REFERENCES roles(id),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS user_page_access (
  user_id VARCHAR(25) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  page_key TEXT NOT NULL,
  PRIMARY KEY (user_id, page_key)
);

CREATE TABLE IF NOT EXISTS service_requests (
  id VARCHAR(25) PRIMARY KEY,
  sr_number BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
  requestor_name TEXT NOT NULL,
  contact_info TEXT NOT NULL,
  building TEXT NOT NULL DEFAULT 'HQ',
  area TEXT NOT NULL DEFAULT 'General',
  urgency TEXT NOT NULL DEFAULT 'MEDIUM',
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SUBMITTED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_service_requests_status CHECK (status IN ('SUBMITTED', 'IN_REVIEW', 'CONVERTED', 'CLOSED')),
  CONSTRAINT chk_service_requests_urgency CHECK (urgency IN ('HIGH', 'MEDIUM', 'LOW'))
);

CREATE TABLE IF NOT EXISTS work_orders (
  id VARCHAR(25) PRIMARY KEY,
  wo_number BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'CREATED',
  lead_technician_id VARCHAR(25) NULL REFERENCES users(id),
  service_request_id VARCHAR(25) NULL REFERENCES service_requests(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_work_orders_status CHECK (
    status IN (
      'CREATED',
      'ASSIGNED',
      'IN_PROGRESS',
      'WAITING_FOR_PARTS',
      'COMPLETED',
      'REOPENED',
      'ARCHIVED'
    )
  )
);

CREATE TABLE IF NOT EXISTS labor_entries (
  id VARCHAR(25) PRIMARY KEY,
  work_order_id VARCHAR(25) NULL REFERENCES work_orders(id),
  technician_id VARCHAR(25) NOT NULL REFERENCES users(id),
  hours NUMERIC(10,2) NOT NULL,
  entry_type TEXT NOT NULL,
  entry_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_labor_hours_non_zero CHECK (hours <> 0),
  CONSTRAINT chk_labor_entry_type CHECK (entry_type IN ('WORK_ORDER', 'TRAINING', 'MEETING', 'ADMIN'))
);

CREATE TABLE IF NOT EXISTS materials (
  id VARCHAR(25) PRIMARY KEY,
  work_order_id VARCHAR(25) NOT NULL REFERENCES work_orders(id),
  description TEXT NOT NULL,
  quantity NUMERIC(12,3) NOT NULL,
  unit_cost NUMERIC(12,2) NOT NULL,
  sales_tax_rate NUMERIC(6,5) NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL,
  tax NUMERIC(12,2) NOT NULL,
  total NUMERIC(12,2) NOT NULL,
  created_by VARCHAR(25) NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vendor_invoices (
  id VARCHAR(25) PRIMARY KEY,
  work_order_id VARCHAR(25) NOT NULL REFERENCES work_orders(id),
  vendor_name TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  sales_tax_rate NUMERIC(6,5) NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL,
  tax NUMERIC(12,2) NOT NULL,
  total NUMERIC(12,2) NOT NULL,
  created_by VARCHAR(25) NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(25) PRIMARY KEY,
  user_id VARCHAR(25) NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(25) PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id VARCHAR(25) NOT NULL,
  action TEXT NOT NULL,
  performed_by VARCHAR(25) NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attachments (
  id VARCHAR(25) PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id VARCHAR(25) NOT NULL,
  original_file_name TEXT NOT NULL,
  server_file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  uploaded_by VARCHAR(25) NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_created_at ON work_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_page_access_user_id ON user_page_access(user_id);
CREATE INDEX IF NOT EXISTS idx_facility_zones_facility_id ON facility_zones(facility_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON service_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_requests_building_area ON service_requests(building, area);
CREATE INDEX IF NOT EXISTS idx_labor_entries_technician_date ON labor_entries(technician_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_materials_work_order_id ON materials(work_order_id);
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_work_order_id ON vendor_invoices(work_order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id);

ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS building TEXT NOT NULL DEFAULT 'HQ',
  ADD COLUMN IF NOT EXISTS area TEXT NOT NULL DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS urgency TEXT NOT NULL DEFAULT 'MEDIUM';

ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS facility_name TEXT NOT NULL DEFAULT 'HQ',
  ADD COLUMN IF NOT EXISTS zone_name TEXT NULL;

ALTER TABLE facilities
  ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS zipcode TEXT NOT NULL DEFAULT '';
