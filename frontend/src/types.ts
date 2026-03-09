export type RoleName = "TECHNICIAN" | "MANAGER" | "ACCOUNTANT" | "ADMIN";
export type PageAccessKey =
  | "dashboard"
  | "work-orders"
  | "service-requests"
  | "timesheet"
  | "costs"
  | "reports"
  | "theme-templates"
  | "facilities"
  | "attachments"
  | "inventory"
  | "notifications"
  | "admin-users";

export type AuthUser = {
  id: string;
  email: string;
  fullName?: string;
  roles: RoleName[];
  pageAccess?: PageAccessKey[];
};

export type WorkOrder = {
  id: string;
  wo_number: number;
  title: string;
  description: string;
  status: string;
  facility_name: string;
  zone_name?: string | null;
  lead_technician_id?: string | null;
  lead_technician_name?: string | null;
  service_request_id?: string | null;
  service_request_number?: number | null;
  created_at: string;
  updated_at?: string;
};

export type ServiceRequest = {
  id: string;
  sr_number: number;
  requestor_name: string;
  contact_info: string;
  building: string;
  area: string;
  urgency: "HIGH" | "MEDIUM" | "LOW";
  description: string;
  status: string;
  work_order_id?: string | null;
  work_order_number?: number | null;
  created_at: string;
  updated_at?: string;
};

export type LaborEntry = {
  id: string;
  work_order_id: string | null;
  work_order_number?: number | null;
  technician_id: string;
  technician_name?: string | null;
  hours: number;
  entry_type: "WORK_ORDER" | "TRAINING" | "MEETING" | "ADMIN";
  entry_date: string;
  created_at: string;
};

export type TimesheetRow = {
  technician_id: string;
  full_name: string;
  entry_date: string;
  total_hours: number;
};

export type NotificationItem = {
  id: string;
  user_id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export type MaterialItem = {
  id: string;
  work_order_id: string;
  description: string;
  quantity: number;
  unit_cost: number;
  sales_tax_rate: number;
  subtotal: number;
  tax: number;
  total: number;
  created_by: string;
  created_at: string;
};

export type VendorInvoiceItem = {
  id: string;
  work_order_id: string;
  vendor_name: string;
  invoice_number: string;
  amount: number;
  sales_tax_rate: number;
  subtotal: number;
  tax: number;
  total: number;
  created_by: string;
  created_at: string;
};

export type CostTotals = {
  workOrderId: string;
  material: { subtotal: number; tax: number; total: number };
  vendor: { subtotal: number; tax: number; total: number };
  combined: { subtotal: number; tax: number; total: number };
};

export type AttachmentItem = {
  id: string;
  entity_type: string;
  entity_id: string;
  work_order_number?: number | null;
  original_file_name: string;
  mime_type: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
};

export type WorkOrderNote = {
  id: string;
  work_order_id: string;
  note: string;
  created_by: string;
  created_by_name?: string | null;
  created_at: string;
};

export type InventoryLocation = {
  id: string;
  name: string;
  location_type: "WAREHOUSE" | "VAN";
  created_at: string;
};

export type InventoryListItem = {
  part_id: string;
  part_number: string;
  part_name: string;
  location_id: string;
  location_name: string;
  location_type: "WAREHOUSE" | "VAN";
  quantity: number;
};

export type InventoryAvailablePart = {
  part_id: string;
  part_number: string;
  part_name: string;
  quantity: number;
};

export type InventoryTransactionItem = {
  id: string;
  transaction_type: "PURCHASE" | "TRANSFER" | "CONSUME";
  part_id: string;
  part_number: string;
  part_name: string;
  from_location_id?: string | null;
  from_location_name?: string | null;
  from_location_type?: "WAREHOUSE" | "VAN" | null;
  to_location_id?: string | null;
  to_location_name?: string | null;
  to_location_type?: "WAREHOUSE" | "VAN" | null;
  quantity: number;
  work_order_id?: string | null;
  work_order_number?: number | null;
  note: string;
  created_by: string;
  created_by_name?: string | null;
  created_at: string;
};

export type WorkOrderConsumedPart = {
  id: string;
  work_order_id: string;
  part_id: string;
  part_number: string;
  part_name: string;
  location_id: string;
  location_name: string;
  location_type: "WAREHOUSE" | "VAN";
  quantity: number;
  consumed_by: string;
  consumed_by_name?: string | null;
  created_at: string;
};

export type WorkOrderStatusCount = {
  status: string;
  count: number;
};

export type DashboardServiceRequestItem = {
  id: string;
  sr_number: number;
  requestor_name: string;
  status: string;
  building?: string;
  area?: string;
  urgency?: "HIGH" | "MEDIUM" | "LOW";
  created_at: string;
};

export type Facility = {
  id: string;
  name: string;
  address: string;
  city: string;
  zipcode: string;
  contact_info: string;
  zones: string[];
};

export type DashboardClosedByWeek = {
  week_start: string;
  closed_count: number;
};

export type DashboardOpenByTechnician = {
  technician_id: string;
  full_name: string;
  open_count: number;
};

export type DashboardLongestOpenWorkOrder = {
  id: string;
  wo_number: number;
  technician_name?: string | null;
  opened_at: string;
  duration_open_hours: number;
};

export type DashboardSummary = {
  workOrdersByStatus: WorkOrderStatusCount[];
  newServiceRequests: {
    count: number;
    items: DashboardServiceRequestItem[];
  };
  closedByWeek: DashboardClosedByWeek[];
  openAssignedByTechnician: DashboardOpenByTechnician[];
  longestOpenWorkOrders: DashboardLongestOpenWorkOrder[];
  avgTimeToCloseDays: number;
};
