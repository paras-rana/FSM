import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { PlusIcon } from "../components/Icons";
import { api } from "../modules/api/client";
import { useAuth } from "../modules/auth/AuthContext";
import { hasAnyRole } from "../modules/auth/roles";
import type {
  AttachmentItem,
  CostTotals,
  LaborEntry,
  MaterialItem,
  VendorInvoiceItem,
  WorkOrder,
  WorkOrderNote
} from "../types";

const statuses = [
  "CREATED",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_FOR_PARTS",
  "COMPLETED",
  "REOPENED",
  "ARCHIVED"
] as const;

const currency = (value: number): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
const escapeHtml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const createReportWindow = () => {
  const popup = window.open("about:blank", "_blank");
  if (!popup) {
    throw new Error("Popup blocked. Allow popups to generate the PDF report.");
  }
  popup.opener = null;
  return popup;
};

const renderReportWindow = (popup: Window, title: string, bodyHtml: string) => {
  popup.document.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
      h1 { margin: 0 0 12px; font-size: 22px; }
      h2 { margin: 18px 0 8px; font-size: 16px; }
      p { margin: 4px 0; }
      table { width: 100%; border-collapse: collapse; margin: 8px 0 18px; font-size: 12px; }
      th, td { border: 1px solid #cbd5e1; text-align: left; padding: 6px; vertical-align: top; }
      th { background: #f1f5f9; }
      .meta { margin-bottom: 10px; color: #334155; }
    </style>
  </head>
  <body>
    ${bodyHtml}
  </body>
</html>`);
  popup.document.close();
  popup.focus();
  setTimeout(() => popup.print(), 250);
};

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
const today = new Date().toISOString().slice(0, 10);

type TechnicianOption = {
  id: string;
  full_name: string;
  email: string;
};

type OverlayType = "material" | "labor" | "vendor" | "attachment" | "status" | "reassign" | null;
type ReassignCostType = "material" | "vendor";
type ReassignCostOption = {
  key: string;
  id: string;
  type: ReassignCostType;
  label: string;
};
type ActivityRow = {
  id: string;
  type: "Material Cost" | "Vendor Cost" | "Labor" | "Attachment";
  details: string;
  amountOrHours: string;
  createdAt: string;
  onAction?: () => void;
};

export const WorkOrderDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [totals, setTotals] = useState<CostTotals | null>(null);
  const [labor, setLabor] = useState<LaborEntry[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [vendorInvoices, setVendorInvoices] = useState<VendorInvoiceItem[]>([]);
  const [workOrderOptions, setWorkOrderOptions] = useState<WorkOrder[]>([]);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [notes, setNotes] = useState<WorkOrderNote[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeOverlay, setActiveOverlay] = useState<OverlayType>(null);
  const [nextStatus, setNextStatus] = useState("");
  const [materialForm, setMaterialForm] = useState({
    description: "",
    quantity: "1",
    unitCost: "0",
    salesTaxRate: "0.1"
  });
  const [vendorForm, setVendorForm] = useState({
    vendorName: "",
    invoiceNumber: "",
    amount: "0",
    salesTaxRate: "0.1"
  });
  const [laborForm, setLaborForm] = useState({
    hours: "1",
    technicianId: "",
    entryDate: today
  });
  const [file, setFile] = useState<File | null>(null);
  const [newNote, setNewNote] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [reassignForm, setReassignForm] = useState({
    costKey: "",
    toWorkOrderId: "",
    reason: ""
  });

  const canManageCosts = useMemo(
    () => hasAnyRole(user?.roles, ["MANAGER", "ADMIN"]),
    [user?.roles]
  );
  const canCreateLaborOrAttachments = useMemo(
    () => hasAnyRole(user?.roles, ["TECHNICIAN", "MANAGER", "ADMIN"]),
    [user?.roles]
  );
  const isManagerOrAdmin = useMemo(
    () => hasAnyRole(user?.roles, ["MANAGER", "ADMIN"]),
    [user?.roles]
  );
  const laborTotalHours = useMemo(
    () => labor.reduce((sum, entry) => sum + Number(entry.hours || 0), 0),
    [labor]
  );
  const technicianNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const technician of technicians) {
      map.set(technician.id, technician.full_name);
    }
    return map;
  }, [technicians]);

  const resolveTechnicianLabel = (technicianId?: string | null, technicianName?: string | null) => {
    if (technicianName) return technicianName;
    if (technicianId && technicianNameById.has(technicianId)) return technicianNameById.get(technicianId)!;
    return "Unknown Technician";
  };
  const leadTechnicianLabel = resolveTechnicianLabel(
    workOrder?.lead_technician_id,
    workOrder?.lead_technician_name
  );
  const reassignCostOptions = useMemo<ReassignCostOption[]>(() => {
    const materialOptions = materials.map((item) => ({
      key: `material:${item.id}`,
      id: item.id,
      type: "material" as const,
      label: `Material | ${new Date(item.created_at).toLocaleDateString()} | ${item.description} | ${currency(
        Number(item.total)
      )}`
    }));
    const vendorOptions = vendorInvoices.map((item) => ({
      key: `vendor:${item.id}`,
      id: item.id,
      type: "vendor" as const,
      label: `Vendor | ${new Date(item.created_at).toLocaleDateString()} | ${item.vendor_name} | Inv ${item.invoice_number} | ${currency(
        Number(item.total)
      )}`
    }));
    return [...materialOptions, ...vendorOptions];
  }, [materials, vendorInvoices]);

  const loadDetails = async (workOrderId: string, showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const [woRes, totalsRes, materialsRes, vendorInvoicesRes, laborRes, uploadsRes, notesRes] = await Promise.all([
        api.get<WorkOrder>(`/work-orders/${workOrderId}`),
        api.get<CostTotals>(`/costs/totals?workOrderId=${workOrderId}`),
        api.get<MaterialItem[]>(`/costs/materials?workOrderId=${workOrderId}`),
        api.get<VendorInvoiceItem[]>(`/costs/vendor-invoices?workOrderId=${workOrderId}`),
        api.get<LaborEntry[]>(`/labor-entries?workOrderId=${workOrderId}&limit=200`),
        api.get<AttachmentItem[]>(`/uploads?entityType=WORK_ORDER&entityId=${workOrderId}&limit=200`),
        api.get<WorkOrderNote[]>(`/work-orders/${workOrderId}/notes`)
      ]);
      setWorkOrder(woRes.data);
      setNextStatus("");
      setTotals(totalsRes.data);
      setMaterials(materialsRes.data);
      setVendorInvoices(vendorInvoicesRes.data);
      setLabor(laborRes.data);
      setAttachments(uploadsRes.data);
      setNotes(notesRes.data);
    } catch {
      setError("Failed to load work order details.");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setLoading(false);
        setError("Invalid work order.");
        return;
      }
      await loadDetails(id, true);
    };
    void load();
  }, [id]);

  useEffect(() => {
    const loadWorkOrderOptions = async () => {
      if (!canManageCosts) return;
      try {
        const response = await api.get<WorkOrder[]>("/work-orders?limit=500");
        setWorkOrderOptions(response.data);
      } catch {
        setError("Failed to load work order options.");
      }
    };
    void loadWorkOrderOptions();
  }, [canManageCosts]);

  useEffect(() => {
    const loadTechnicians = async () => {
      if (!isManagerOrAdmin) return;
      try {
        const response = await api.get<TechnicianOption[]>("/labor-entries/technicians");
        setTechnicians(response.data);
        setLaborForm((prev) => ({
          ...prev,
          technicianId: prev.technicianId || response.data[0]?.id || ""
        }));
      } catch {
        setError("Failed to load technician options.");
      }
    };
    void loadTechnicians();
  }, [isManagerOrAdmin]);

  const createMaterial = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id || !canManageCosts) return;
    setSaving(true);
    setError(null);
    try {
      await api.post("/costs/materials", {
        workOrderId: id,
        description: materialForm.description,
        quantity: Number(materialForm.quantity),
        unitCost: Number(materialForm.unitCost),
        salesTaxRate: Number(materialForm.salesTaxRate)
      });
      setMaterialForm({ description: "", quantity: "1", unitCost: "0", salesTaxRate: "0.1" });
      setActiveOverlay(null);
      await loadDetails(id, false);
    } catch {
      setError("Failed to create material entry.");
    } finally {
      setSaving(false);
    }
  };

  const createVendor = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id || !canManageCosts) return;
    setSaving(true);
    setError(null);
    try {
      await api.post("/costs/vendor-invoices", {
        workOrderId: id,
        vendorName: vendorForm.vendorName,
        invoiceNumber: vendorForm.invoiceNumber,
        amount: Number(vendorForm.amount),
        salesTaxRate: Number(vendorForm.salesTaxRate)
      });
      setVendorForm({ vendorName: "", invoiceNumber: "", amount: "0", salesTaxRate: "0.1" });
      setActiveOverlay(null);
      await loadDetails(id, false);
    } catch {
      setError("Failed to create vendor invoice.");
    } finally {
      setSaving(false);
    }
  };

  const createLaborEntry = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id || !canCreateLaborOrAttachments) return;
    setSaving(true);
    setError(null);
    try {
      await api.post("/labor-entries", {
        workOrderId: id,
        technicianId: isManagerOrAdmin ? laborForm.technicianId : user?.id,
        hours: Number(laborForm.hours),
        entryType: "WORK_ORDER",
        entryDate: laborForm.entryDate
      });
      setLaborForm((prev) => ({ ...prev, hours: "1", entryDate: today }));
      setActiveOverlay(null);
      await loadDetails(id, false);
    } catch {
      setError("Could not create labor entry. Check date/hours constraints.");
    } finally {
      setSaving(false);
    }
  };

  const uploadAttachment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id || !canCreateLaborOrAttachments || !file) return;
    setSaving(true);
    setError(null);
    try {
      const data = new FormData();
      data.append("entityType", "WORK_ORDER");
      data.append("entityId", id);
      data.append("file", file);
      await api.post("/uploads", data, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setFile(null);
      setActiveOverlay(null);
      await loadDetails(id, false);
    } catch {
      setError("Upload failed. Check file type/size limits.");
    } finally {
      setSaving(false);
    }
  };

  const downloadAttachment = async (item: AttachmentItem) => {
    setError(null);
    try {
      const response = await api.get(`/uploads/${item.id}/download`, {
        responseType: "blob"
      });
      const blobUrl = URL.createObjectURL(response.data as Blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = item.original_file_name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      setError("Download failed.");
    }
  };

  const updateStatus = async () => {
    if (!id || !isManagerOrAdmin || !nextStatus) return;
    setStatusSaving(true);
    setError(null);
    try {
      await api.post(`/work-orders/${id}/status`, { status: nextStatus });
      setNextStatus("");
      setActiveOverlay(null);
      await loadDetails(id, false);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Status update failed.";
      setError(message);
    } finally {
      setStatusSaving(false);
    }
  };

  const createNote = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id) return;
    const note = newNote.trim();
    if (!note) return;
    setNoteSaving(true);
    setError(null);
    try {
      const response = await api.post<WorkOrderNote>(`/work-orders/${id}/notes`, { note });
      setNotes((prev) => [response.data, ...prev]);
      setNewNote("");
    } catch {
      setError("Failed to add note.");
    } finally {
      setNoteSaving(false);
    }
  };

  const reassignCost = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id || !canManageCosts || !reassignForm.costKey || !reassignForm.toWorkOrderId) return;

    const [type, costId] = reassignForm.costKey.split(":");
    if (!costId || (type !== "material" && type !== "vendor")) {
      setError("Invalid cost selection.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (type === "material") {
        await api.post("/costs/materials/reassign", {
          materialId: costId,
          toWorkOrderId: reassignForm.toWorkOrderId,
          reason: reassignForm.reason.trim() || undefined
        });
      } else {
        await api.post("/costs/vendor-invoices/reassign", {
          vendorInvoiceId: costId,
          toWorkOrderId: reassignForm.toWorkOrderId,
          reason: reassignForm.reason.trim() || undefined
        });
      }

      setReassignForm({ costKey: "", toWorkOrderId: "", reason: "" });
      setActiveOverlay(null);
      await loadDetails(id, false);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to reassign cost.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const activityRows = useMemo<ActivityRow[]>(() => {
    const materialRows: ActivityRow[] = materials.map((item) => ({
      id: `m-${item.id}`,
      type: "Material Cost",
      details: item.description,
      amountOrHours: currency(item.total),
      createdAt: item.created_at
    }));
    const vendorRows: ActivityRow[] = vendorInvoices.map((item) => ({
      id: `v-${item.id}`,
      type: "Vendor Cost",
      details: `${item.vendor_name} | Invoice ${item.invoice_number}`,
      amountOrHours: currency(item.total),
      createdAt: item.created_at
    }));
    const laborRows: ActivityRow[] = labor.map((item) => ({
      id: `l-${item.id}`,
      type: "Labor",
      details: `${resolveTechnicianLabel(item.technician_id, item.technician_name)} | ${item.entry_type}`,
      amountOrHours: `${Number(item.hours).toFixed(2)} hrs`,
      createdAt: item.created_at
    }));
    const attachmentRows: ActivityRow[] = attachments.map((item) => ({
      id: `a-${item.id}`,
      type: "Attachment",
      details: `${item.original_file_name} (${item.mime_type}, ${formatSize(item.file_size)})`,
      amountOrHours: "-",
      createdAt: item.created_at,
      onAction: () => void downloadAttachment(item)
    }));
    return [...materialRows, ...vendorRows, ...laborRows, ...attachmentRows].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [attachments, labor, materials, vendorInvoices]);

  const generatePdfReport = () => {
    if (!workOrder || !totals) return;
    setError(null);
    try {
      const materialRows = materials
        .map(
          (item) =>
            `<tr><td>${escapeHtml(new Date(item.created_at).toLocaleString())}</td><td>${escapeHtml(
              item.description
            )}</td><td>${Number(item.quantity).toFixed(3)}</td><td>${currency(Number(item.unit_cost))}</td><td>${currency(
              Number(item.tax)
            )}</td><td>${currency(Number(item.total))}</td></tr>`
        )
        .join("");
      const vendorRows = vendorInvoices
        .map(
          (item) =>
            `<tr><td>${escapeHtml(new Date(item.created_at).toLocaleString())}</td><td>${escapeHtml(
              item.vendor_name
            )}</td><td>${escapeHtml(item.invoice_number)}</td><td>${currency(Number(item.subtotal))}</td><td>${currency(
              Number(item.tax)
            )}</td><td>${currency(Number(item.total))}</td></tr>`
        )
        .join("");
      const laborRows = labor
        .map(
          (entry) =>
            `<tr><td>${escapeHtml(entry.entry_date)}</td><td>${escapeHtml(
              resolveTechnicianLabel(entry.technician_id, entry.technician_name)
            )}</td><td>${escapeHtml(entry.entry_type)}</td><td>${Number(entry.hours).toFixed(2)}</td><td>${escapeHtml(
              new Date(entry.created_at).toLocaleString()
            )}</td></tr>`
        )
        .join("");
      const attachmentRows = attachments
        .map(
          (item) =>
            `<tr><td>${escapeHtml(new Date(item.created_at).toLocaleString())}</td><td>${escapeHtml(
              item.original_file_name
            )}</td><td>${escapeHtml(item.mime_type)}</td><td>${escapeHtml(formatSize(item.file_size))}</td></tr>`
        )
        .join("");

      const html = `<h1>Work Order Detail Report</h1>
        <p class="meta">Work Order: ${escapeHtml(`WO-${workOrder.wo_number}`)} | ${escapeHtml(workOrder.title)}</p>
        <p class="meta">Status: ${escapeHtml(workOrder.status)} | Facility: ${escapeHtml(workOrder.facility_name)}</p>
        <p class="meta">Zone / Room: ${escapeHtml(workOrder.zone_name ?? "-")} | Lead Technician: ${escapeHtml(
          leadTechnicianLabel
        )}</p>
        <p class="meta">Created: ${escapeHtml(
          new Date(workOrder.created_at).toLocaleString()
        )} | Updated: ${escapeHtml(
          workOrder.updated_at ? new Date(workOrder.updated_at).toLocaleString() : "-"
        )}</p>
        <p class="meta">Description: ${escapeHtml(workOrder.description)}</p>
        <h2>Cost Summary</h2>
        <p class="meta">Material Subtotal: ${currency(Number(totals.material.subtotal))}</p>
        <p class="meta">Material Tax: ${currency(Number(totals.material.tax))}</p>
        <p class="meta">Material Total: ${currency(Number(totals.material.total))}</p>
        <p class="meta">Vendor Subtotal: ${currency(Number(totals.vendor.subtotal))}</p>
        <p class="meta">Vendor Tax: ${currency(Number(totals.vendor.tax))}</p>
        <p class="meta">Vendor Total: ${currency(Number(totals.vendor.total))}</p>
        <p class="meta">Combined Total: ${currency(Number(totals.combined.total))}</p>
        <h2>Labor Summary</h2>
        <p class="meta">Total Labor Hours: ${laborTotalHours.toFixed(2)}</p>
        <h2>Material Cost Detail</h2>
        <table><thead><tr><th>Created</th><th>Description</th><th>Qty</th><th>Unit Cost</th><th>Tax</th><th>Total</th></tr></thead><tbody>${
          materialRows || '<tr><td colspan="6">No material entries.</td></tr>'
        }</tbody></table>
        <h2>Vendor Invoice Detail</h2>
        <table><thead><tr><th>Created</th><th>Vendor</th><th>Invoice #</th><th>Subtotal</th><th>Tax</th><th>Total</th></tr></thead><tbody>${
          vendorRows || '<tr><td colspan="6">No vendor invoice entries.</td></tr>'
        }</tbody></table>
        <h2>Labor Detail</h2>
        <table><thead><tr><th>Entry Date</th><th>Technician</th><th>Type</th><th>Hours</th><th>Created</th></tr></thead><tbody>${
          laborRows || '<tr><td colspan="5">No labor entries.</td></tr>'
        }</tbody></table>
        <h2>Attachment Detail</h2>
        <table><thead><tr><th>Uploaded</th><th>File Name</th><th>MIME Type</th><th>Size</th></tr></thead><tbody>${
          attachmentRows || '<tr><td colspan="4">No attachments.</td></tr>'
        }</tbody></table>`;

      const popup = createReportWindow();
      renderReportWindow(popup, `WO-${workOrder.wo_number} Detail Report`, html);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate PDF report.";
      setError(message);
    }
  };

  return (
    <AppShell title="Work Order Detail">
      <section className="rounded-2xl bg-fsm-panel shadow p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold mt-2">
            {workOrder ? `WO-${workOrder.wo_number} | ${workOrder.title}` : "Loading..."}
          </h2>
          {!loading && workOrder && (
            <div className="text-right">
              <p className="text-xs text-slate-600 uppercase tracking-wide">Status</p>
              <div className="mt-1 flex items-center justify-end gap-2">
                <p className="text-lg font-bold tracking-wide">{workOrder.status}</p>
                {isManagerOrAdmin && (
                  <button
                    type="button"
                    onClick={() => setActiveOverlay("status")}
                    className="inline-flex items-center gap-1 rounded bg-sky-100 text-sky-700 px-3 py-2 text-sm hover:bg-sky-200 disabled:opacity-50"
                  >
                    <PlusIcon size={14} />
                    <span>Update Status</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        {loading && <p className="text-slate-600 mt-3">Loading details...</p>}
      </section>

      {!loading && workOrder && totals && (
        <>
          <section className="rounded-2xl bg-fsm-panel shadow p-6">
            <article className="mb-4 rounded border p-3">
              <p className="font-semibold mb-2">Description</p>
              <p className="text-sm">{workOrder.description}</p>
            </article>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="rounded border border-fsm-border bg-white p-3">
                <p><strong>Facility:</strong> {workOrder.facility_name}</p>
                <p><strong>Zone / Room:</strong> {workOrder.zone_name ?? "-"}</p>
              </div>
              <div className="rounded border border-fsm-border bg-white p-3">
                <p><strong>Tech Assigned:</strong> {leadTechnicianLabel}</p>
              </div>
              <div className="rounded border border-fsm-border bg-white p-3">
                <p><strong>Created:</strong> {new Date(workOrder.created_at).toLocaleString()}</p>
                <p><strong>Updated:</strong> {workOrder.updated_at ? new Date(workOrder.updated_at).toLocaleString() : "-"}</p>
                <p>
                  <strong>Service Request:</strong>{" "}
                  {workOrder.service_request_id && workOrder.service_request_number ? (
                    <Link to={`/service-requests/${workOrder.service_request_id}`} className="underline">
                      SR-{workOrder.service_request_number}
                    </Link>
                  ) : (
                    "-"
                  )}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-fsm-panel shadow p-6">
            <div className="flex flex-wrap gap-3">
              <button type="button" className="rounded bg-fsm-accent text-white px-4 py-2 text-sm hover:bg-fsm-accentDark disabled:opacity-50" onClick={() => setActiveOverlay("material")} disabled={!canManageCosts}>Add Material Cost</button>
              <button type="button" className="rounded bg-fsm-accent text-white px-4 py-2 text-sm hover:bg-fsm-accentDark disabled:opacity-50" onClick={() => setActiveOverlay("labor")} disabled={!canCreateLaborOrAttachments}>Add Labor</button>
              <button type="button" className="rounded bg-fsm-accent text-white px-4 py-2 text-sm hover:bg-fsm-accentDark disabled:opacity-50" onClick={() => setActiveOverlay("vendor")} disabled={!canManageCosts}>Add Vendor Invoice</button>
              <button type="button" className="rounded bg-fsm-accent text-white px-4 py-2 text-sm hover:bg-fsm-accentDark disabled:opacity-50" onClick={() => setActiveOverlay("attachment")} disabled={!canCreateLaborOrAttachments}>Add Attachments</button>
              <button type="button" className="rounded bg-fsm-accent text-white px-4 py-2 text-sm hover:bg-fsm-accentDark disabled:opacity-50" onClick={() => setActiveOverlay("reassign")} disabled={!canManageCosts}>Reassign Cost</button>
            </div>
          </section>

          <section className="rounded-2xl bg-fsm-panel shadow p-6">
            <h2 className="text-xl font-semibold mb-3">Material Costs, Vendor Costs, Labor & Attachments</h2>
            {activityRows.length === 0 ? (
              <p className="text-slate-600">No records yet.</p>
            ) : (
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-3">Type</th>
                      <th className="py-2 pr-3">Details</th>
                      <th className="py-2 pr-3">Amount / Hours</th>
                      <th className="py-2 pr-3">Created</th>
                      <th className="py-2 pr-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityRows.map((row) => (
                      <tr key={row.id} className="border-b last:border-0">
                        <td className="py-2 pr-3">{row.type}</td>
                        <td className="py-2 pr-3">{row.details}</td>
                        <td className="py-2 pr-3">{row.amountOrHours}</td>
                        <td className="py-2 pr-3">{new Date(row.createdAt).toLocaleString()}</td>
                        <td className="py-2 pr-3">
                          {row.onAction ? (
                            <button className="rounded bg-fsm-accent text-white px-3 py-1.5 text-sm hover:bg-fsm-accentDark" onClick={row.onAction}>
                              Download
                            </button>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-fsm-panel shadow p-6">
            <h2 className="text-xl font-semibold mb-3">Notes</h2>
            <form onSubmit={createNote} className="flex items-start gap-2 mb-3">
              <textarea
                className="rounded border border-fsm-border px-3 py-2 text-sm w-full resize-y min-h-[64px]"
                placeholder="Add a work order note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                maxLength={2000}
              />
              <button
                type="submit"
                disabled={noteSaving || !newNote.trim()}
                className="rounded bg-fsm-accent text-white px-3 py-2 text-sm hover:bg-fsm-accentDark disabled:opacity-50"
              >
                {noteSaving ? "Saving..." : "Add"}
              </button>
            </form>
            <div className="rounded border border-fsm-border bg-white max-h-56 overflow-auto">
              {notes.length === 0 ? (
                <p className="px-3 py-2 text-sm text-slate-600">No notes yet.</p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="px-3 py-2 border-b last:border-b-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm whitespace-pre-wrap break-words flex-1">{note.note}</p>
                      <p className="text-xs text-slate-600 text-right shrink-0">
                        {(note.created_by_name || "Unknown User")}<br />
                        {new Date(note.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl bg-fsm-panel shadow p-6">
            <div className="flex justify-end">
              <button type="button" onClick={generatePdfReport} className="rounded bg-fsm-accent text-white px-4 py-2 text-sm hover:bg-fsm-accentDark">
                Generate Work Order PDF
              </button>
            </div>
          </section>

          <div
            className={`fixed inset-0 z-50 transition-opacity duration-500 ${
              activeOverlay ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <div
              className={`absolute inset-0 bg-black/30 transition-opacity duration-500 ${
                activeOverlay ? "opacity-100" : "opacity-0"
              }`}
              onClick={() => setActiveOverlay(null)}
            />
            <aside
              className={`fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl p-6 overflow-auto transform transition-transform duration-500 ease-out ${
                activeOverlay ? "translate-x-0" : "translate-x-full"
              }`}
            >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    {activeOverlay === "material" && "Add Material Cost"}
                    {activeOverlay === "labor" && "Add Labor"}
                    {activeOverlay === "vendor" && "Add Vendor Invoice"}
                    {activeOverlay === "attachment" && "Add Attachments"}
                    {activeOverlay === "status" && "Update Status"}
                    {activeOverlay === "reassign" && "Reassign Cost"}
                  </h3>
                  <button className="rounded border px-3 py-1.5 text-sm" onClick={() => setActiveOverlay(null)}>Close</button>
                </div>

                {activeOverlay === "material" && (
                  <form className="space-y-3" onSubmit={createMaterial}>
                    <input className="rounded border px-3 py-2 w-full" placeholder="Description" value={materialForm.description} onChange={(e) => setMaterialForm((prev) => ({ ...prev, description: e.target.value }))} required />
                    <div className="grid grid-cols-3 gap-2">
                      <input type="number" step="0.001" className="rounded border px-3 py-2" placeholder="Quantity" value={materialForm.quantity} onChange={(e) => setMaterialForm((prev) => ({ ...prev, quantity: e.target.value }))} required />
                      <input type="number" step="0.01" className="rounded border px-3 py-2" placeholder="Unit Cost" value={materialForm.unitCost} onChange={(e) => setMaterialForm((prev) => ({ ...prev, unitCost: e.target.value }))} required />
                      <input type="number" step="0.0001" min="0" max="1" className="rounded border px-3 py-2" placeholder="Tax Rate" value={materialForm.salesTaxRate} onChange={(e) => setMaterialForm((prev) => ({ ...prev, salesTaxRate: e.target.value }))} required />
                    </div>
                    <button type="submit" disabled={saving} className="rounded bg-fsm-accent text-white px-4 py-2 text-sm hover:bg-fsm-accentDark disabled:opacity-50">{saving ? "Saving..." : "Save Material"}</button>
                  </form>
                )}

                {activeOverlay === "labor" && (
                  <form className="space-y-3" onSubmit={createLaborEntry}>
                    <input type="number" min="0.1" step="0.1" className="rounded border px-3 py-2 w-full" placeholder="Hours" value={laborForm.hours} onChange={(e) => setLaborForm((prev) => ({ ...prev, hours: e.target.value }))} required />
                    {isManagerOrAdmin && (
                      <select className="rounded border px-3 py-2 w-full" value={laborForm.technicianId} onChange={(e) => setLaborForm((prev) => ({ ...prev, technicianId: e.target.value }))} required>
                        {technicians.map((technician) => (
                          <option key={technician.id} value={technician.id}>{technician.full_name} ({technician.email})</option>
                        ))}
                      </select>
                    )}
                    <input type="date" className="rounded border px-3 py-2 w-full" value={laborForm.entryDate} onChange={(e) => setLaborForm((prev) => ({ ...prev, entryDate: e.target.value }))} required />
                    <button type="submit" disabled={saving} className="rounded bg-fsm-accent text-white px-4 py-2 text-sm hover:bg-fsm-accentDark disabled:opacity-50">{saving ? "Saving..." : "Save Labor"}</button>
                  </form>
                )}

                {activeOverlay === "vendor" && (
                  <form className="space-y-3" onSubmit={createVendor}>
                    <input className="rounded border px-3 py-2 w-full" placeholder="Vendor Name" value={vendorForm.vendorName} onChange={(e) => setVendorForm((prev) => ({ ...prev, vendorName: e.target.value }))} required />
                    <input className="rounded border px-3 py-2 w-full" placeholder="Invoice Number" value={vendorForm.invoiceNumber} onChange={(e) => setVendorForm((prev) => ({ ...prev, invoiceNumber: e.target.value }))} required />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" step="0.01" className="rounded border px-3 py-2" placeholder="Amount" value={vendorForm.amount} onChange={(e) => setVendorForm((prev) => ({ ...prev, amount: e.target.value }))} required />
                      <input type="number" step="0.0001" min="0" max="1" className="rounded border px-3 py-2" placeholder="Tax Rate" value={vendorForm.salesTaxRate} onChange={(e) => setVendorForm((prev) => ({ ...prev, salesTaxRate: e.target.value }))} required />
                    </div>
                    <button type="submit" disabled={saving} className="rounded bg-fsm-accent text-white px-4 py-2 text-sm hover:bg-fsm-accentDark disabled:opacity-50">{saving ? "Saving..." : "Save Vendor Invoice"}</button>
                  </form>
                )}

                {activeOverlay === "attachment" && (
                  <form className="space-y-3" onSubmit={uploadAttachment}>
                    <input className="rounded border px-3 py-2 w-full bg-slate-50" value={workOrder ? `WO-${workOrder.wo_number} | ${workOrder.title}` : ""} readOnly />
                    <input type="file" className="rounded border px-3 py-2 w-full" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
                    <button type="submit" disabled={saving || !file} className="rounded bg-fsm-accent text-white px-4 py-2 text-sm hover:bg-fsm-accentDark disabled:opacity-50">{saving ? "Uploading..." : "Upload Attachment"}</button>
                  </form>
                )}

                {activeOverlay === "status" && (
                  <form
                    className="space-y-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void updateStatus();
                    }}
                  >
                    <p className="text-sm text-slate-600">
                      Current Status: <span className="font-semibold text-fsm-ink">{workOrder.status}</span>
                    </p>
                    <select
                      className="rounded border px-3 py-2 w-full"
                      value={nextStatus}
                      onChange={(e) => setNextStatus(e.target.value)}
                      disabled={statusSaving}
                      required
                    >
                      <option value="">Select new status</option>
                      {statuses
                        .filter((status) => status !== workOrder.status)
                        .map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                    </select>
                    <button
                      type="submit"
                      disabled={!nextStatus || statusSaving}
                      className="rounded bg-fsm-accent text-white px-4 py-2 text-sm hover:bg-fsm-accentDark disabled:opacity-50"
                    >
                      {statusSaving ? "Saving..." : "Save Status"}
                    </button>
                  </form>
                )}

                {activeOverlay === "reassign" && (
                  <form className="space-y-3" onSubmit={reassignCost}>
                    <select
                      className="rounded border px-3 py-2 w-full"
                      value={reassignForm.costKey}
                      onChange={(e) => setReassignForm((prev) => ({ ...prev, costKey: e.target.value }))}
                      disabled={saving}
                      required
                    >
                      <option value="">Select cost entry</option>
                      {reassignCostOptions.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <select
                      className="rounded border px-3 py-2 w-full"
                      value={reassignForm.toWorkOrderId}
                      onChange={(e) => setReassignForm((prev) => ({ ...prev, toWorkOrderId: e.target.value }))}
                      disabled={saving}
                      required
                    >
                      <option value="">Select target work order</option>
                      {workOrderOptions
                        .filter((option) => option.id !== id)
                        .map((option) => (
                          <option key={option.id} value={option.id}>
                            {`WO-${option.wo_number} | ${option.title}`}
                          </option>
                        ))}
                    </select>
                    <textarea
                      className="rounded border px-3 py-2 w-full min-h-[84px]"
                      placeholder="Reason (optional)"
                      value={reassignForm.reason}
                      onChange={(e) => setReassignForm((prev) => ({ ...prev, reason: e.target.value }))}
                      maxLength={500}
                      disabled={saving}
                    />
                    <button
                      type="submit"
                      disabled={saving || reassignCostOptions.length === 0}
                      className="rounded bg-fsm-accent text-white px-4 py-2 text-sm hover:bg-fsm-accentDark disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save Change"}
                    </button>
                    {reassignCostOptions.length === 0 && (
                      <p className="text-sm text-slate-600">No material or vendor cost entries available to reassign.</p>
                    )}
                  </form>
                )}
            </aside>
          </div>
        </>
      )}
    </AppShell>
  );
};
