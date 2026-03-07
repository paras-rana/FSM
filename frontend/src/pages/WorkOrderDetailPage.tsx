import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { api } from "../modules/api/client";
import { useAuth } from "../modules/auth/AuthContext";
import { hasAnyRole } from "../modules/auth/roles";
import type {
  AttachmentItem,
  CostTotals,
  LaborEntry,
  MaterialItem,
  VendorInvoiceItem,
  WorkOrder
} from "../types";

const currency = (value: number): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
const today = new Date().toISOString().slice(0, 10);
const dateTime = (value?: string): string => (value ? new Date(value).toLocaleString() : "-");
const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

type TechnicianOption = {
  id: string;
  full_name: string;
  email: string;
};

export const WorkOrderDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [totals, setTotals] = useState<CostTotals | null>(null);
  const [labor, setLabor] = useState<LaborEntry[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [vendorInvoices, setVendorInvoices] = useState<VendorInvoiceItem[]>([]);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sectionsOpen, setSectionsOpen] = useState({
    costs: false,
    labor: false,
    attachments: false
  });
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
  const serviceRequestLabel = workOrder?.service_request_number
    ? `SR-${workOrder.service_request_number}`
    : "-";
  const leadTechnicianLabel = resolveTechnicianLabel(
    workOrder?.lead_technician_id,
    workOrder?.lead_technician_name
  );
  const toggleSection = (section: "costs" | "labor" | "attachments") => {
    setSectionsOpen((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const loadDetails = async (workOrderId: string, showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const [woRes, totalsRes, materialsRes, vendorInvoicesRes, laborRes, uploadsRes] = await Promise.all([
        api.get<WorkOrder>(`/work-orders/${workOrderId}`),
        api.get<CostTotals>(`/costs/totals?workOrderId=${workOrderId}`),
        api.get<MaterialItem[]>(`/costs/materials?workOrderId=${workOrderId}`),
        api.get<VendorInvoiceItem[]>(`/costs/vendor-invoices?workOrderId=${workOrderId}`),
        api.get<LaborEntry[]>(`/labor-entries?workOrderId=${workOrderId}&limit=200`),
        api.get<AttachmentItem[]>(
          `/uploads?entityType=WORK_ORDER&entityId=${workOrderId}&limit=200`
        )
      ]);
      setWorkOrder(woRes.data);
      setTotals(totalsRes.data);
      setMaterials(materialsRes.data);
      setVendorInvoices(vendorInvoicesRes.data);
      setLabor(laborRes.data);
      setAttachments(uploadsRes.data);
    } catch {
      setError("Failed to load work order details.");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const generatePdfReport = () => {
    if (!workOrder || !totals) return;
    setError(null);

    const reportGeneratedAt = new Date().toLocaleString();
    const materialRows = materials
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.description)}</td>
            <td>${Number(item.quantity).toFixed(3)}</td>
            <td>${currency(Number(item.unit_cost))}</td>
            <td>${(Number(item.sales_tax_rate) * 100).toFixed(2)}%</td>
            <td>${currency(Number(item.subtotal))}</td>
            <td>${currency(Number(item.tax))}</td>
            <td>${currency(Number(item.total))}</td>
            <td>${dateTime(item.created_at)}</td>
          </tr>`
      )
      .join("");
    const vendorRows = vendorInvoices
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.vendor_name)}</td>
            <td>${escapeHtml(item.invoice_number)}</td>
            <td>${currency(Number(item.amount))}</td>
            <td>${(Number(item.sales_tax_rate) * 100).toFixed(2)}%</td>
            <td>${currency(Number(item.subtotal))}</td>
            <td>${currency(Number(item.tax))}</td>
            <td>${currency(Number(item.total))}</td>
            <td>${dateTime(item.created_at)}</td>
          </tr>`
      )
      .join("");
    const laborRows = labor
      .map(
        (entry) => `
          <tr>
            <td>${escapeHtml(entry.entry_date)}</td>
            <td>${Number(entry.hours).toFixed(2)}</td>
            <td>${escapeHtml(entry.entry_type)}</td>
            <td>${escapeHtml(resolveTechnicianLabel(entry.technician_id, entry.technician_name))}</td>
            <td>${dateTime(entry.created_at)}</td>
          </tr>`
      )
      .join("");

    const reportHtml = `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Work Order ${escapeHtml(String(workOrder.wo_number))} Report</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111827; margin: 24px; }
          h1, h2 { margin: 0 0 10px; }
          h2 { margin-top: 28px; }
          .meta { margin-bottom: 14px; line-height: 1.5; }
          .summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 16px 0; }
          .card { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #d1d5db; padding: 7px; font-size: 12px; text-align: left; vertical-align: top; }
          th { background: #f3f4f6; }
          .small { color: #4b5563; font-size: 12px; }
          @media print {
            body { margin: 12mm; }
            h2 { page-break-after: avoid; }
            table, tr, td, th { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <h1>Work Order Report</h1>
        <p class="small">Generated: ${escapeHtml(reportGeneratedAt)}</p>
        <div class="meta">
          <div><strong>WO Number:</strong> ${escapeHtml(String(workOrder.wo_number))}</div>
          <div><strong>Title:</strong> ${escapeHtml(workOrder.title)}</div>
          <div><strong>Status:</strong> ${escapeHtml(workOrder.status)}</div>
          <div><strong>Facility:</strong> ${escapeHtml(workOrder.facility_name)}</div>
          <div><strong>Zone / Room:</strong> ${escapeHtml(workOrder.zone_name ?? "-")}</div>
          <div><strong>Lead Technician:</strong> ${escapeHtml(leadTechnicianLabel)}</div>
          <div><strong>Service Request:</strong> ${escapeHtml(serviceRequestLabel)}</div>
          <div><strong>Created:</strong> ${escapeHtml(dateTime(workOrder.created_at))}</div>
          <div><strong>Updated:</strong> ${escapeHtml(dateTime(workOrder.updated_at))}</div>
        </div>

        <h2>Description</h2>
        <p>${escapeHtml(workOrder.description || "-")}</p>

        <h2>Totals</h2>
        <div class="summary">
          <div class="card"><strong>Material Total</strong><br/>${escapeHtml(currency(totals.material.total))}</div>
          <div class="card"><strong>Vendor Total</strong><br/>${escapeHtml(currency(totals.vendor.total))}</div>
          <div class="card"><strong>Combined Total</strong><br/>${escapeHtml(currency(totals.combined.total))}</div>
        </div>
        <div class="summary">
          <div class="card"><strong>Labor Hours</strong><br/>${laborTotalHours.toFixed(2)} hrs</div>
          <div class="card"><strong>Combined Subtotal</strong><br/>${escapeHtml(currency(totals.combined.subtotal))}</div>
          <div class="card"><strong>Combined Tax</strong><br/>${escapeHtml(currency(totals.combined.tax))}</div>
        </div>

        <h2>Material Line Items</h2>
        ${
          materials.length === 0
            ? "<p class='small'>No material entries.</p>"
            : `<table>
            <thead>
              <tr>
                <th>Description</th><th>Qty</th><th>Unit Cost</th><th>Tax Rate</th><th>Subtotal</th><th>Tax</th><th>Total</th><th>Created</th>
              </tr>
            </thead>
            <tbody>${materialRows}</tbody>
          </table>`
        }

        <h2>Vendor Invoice Line Items</h2>
        ${
          vendorInvoices.length === 0
            ? "<p class='small'>No vendor invoice entries.</p>"
            : `<table>
            <thead>
              <tr>
                <th>Vendor</th><th>Invoice #</th><th>Amount</th><th>Tax Rate</th><th>Subtotal</th><th>Tax</th><th>Total</th><th>Created</th>
              </tr>
            </thead>
            <tbody>${vendorRows}</tbody>
          </table>`
        }

        <h2>Labor Entries</h2>
        ${
          labor.length === 0
            ? "<p class='small'>No labor entries.</p>"
            : `<table>
            <thead>
              <tr>
                <th>Date</th><th>Hours</th><th>Type</th><th>Technician</th><th>Created</th>
              </tr>
            </thead>
            <tbody>${laborRows}</tbody>
          </table>`
        }
      </body>
      </html>`;

    const printFrame = document.createElement("iframe");
    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "0";
    printFrame.setAttribute("aria-hidden", "true");
    document.body.appendChild(printFrame);

    const cleanup = () => {
      printFrame.remove();
    };
    const frameWindow = printFrame.contentWindow;
    if (!frameWindow) {
      cleanup();
      setError("Could not open print preview.");
      return;
    }

    frameWindow.document.open();
    frameWindow.document.write(reportHtml);
    frameWindow.document.close();

    frameWindow.addEventListener("afterprint", cleanup, { once: true });
    setTimeout(cleanup, 60_000);
    setTimeout(() => {
      frameWindow.focus();
      frameWindow.print();
    }, 150);
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

  return (
    <AppShell title="Work Order Detail">
      <section className="rounded-2xl bg-fsm-panel shadow p-6">
        <div>
          <Link to="/work-orders" className="text-sm underline">
            Back to Work Orders
          </Link>
          <h2 className="text-xl font-semibold mt-2">
            {workOrder ? `WO-${workOrder.wo_number} | ${workOrder.title}` : "Loading..."}
          </h2>
        </div>
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        {loading && <p className="text-slate-600 mt-3">Loading details...</p>}
      </section>

      {!loading && !error && workOrder && totals && (
        <>
          <section className="rounded-2xl bg-fsm-panel shadow p-6">
            <h2 className="text-xl font-semibold mb-3">Overview</h2>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="rounded border p-3">
                <p>
                  <strong>WO Number:</strong> {workOrder.wo_number}
                </p>
                <p>
                  <strong>Status:</strong> {workOrder.status}
                </p>
                <p>
                  <strong>Lead Technician:</strong> {leadTechnicianLabel}
                </p>
                <p>
                  <strong>Facility:</strong> {workOrder.facility_name}
                </p>
              </div>
              <div className="rounded border p-3">
                <p>
                  <strong>Created:</strong> {new Date(workOrder.created_at).toLocaleString()}
                </p>
                <p>
                  <strong>Updated:</strong>{" "}
                  {workOrder.updated_at ? new Date(workOrder.updated_at).toLocaleString() : "-"}
                </p>
                <p>
                  <strong>Service Request:</strong> {serviceRequestLabel}
                </p>
                <p>
                  <strong>Zone / Room:</strong> {workOrder.zone_name ?? "-"}
                </p>
              </div>
            </div>
            <article className="mt-4 rounded border p-3">
              <p className="font-semibold mb-2">Description</p>
              <p className="text-sm">{workOrder.description}</p>
            </article>
            <div className="mt-4 grid md:grid-cols-3 gap-4 text-sm">
              <article className="rounded border p-3">
                <p className="text-slate-600">Cost Total</p>
                <p className="text-lg font-semibold">{currency(totals.combined.total)}</p>
              </article>
              <article className="rounded border p-3">
                <p className="text-slate-600">Vendor Total</p>
                <p className="text-lg font-semibold">{currency(totals.vendor.total)}</p>
              </article>
              <article className="rounded border p-3">
                <p className="text-slate-600">Labor Total</p>
                <p className="text-lg font-semibold">{laborTotalHours.toFixed(2)} hrs</p>
              </article>
            </div>
          </section>

          <section className="rounded-2xl bg-fsm-panel shadow p-6">
            <button
              type="button"
              className="w-full flex items-center justify-between text-left"
              onClick={() => toggleSection("costs")}
              aria-expanded={sectionsOpen.costs}
            >
              <h2 className="text-xl font-semibold">Costs</h2>
              <span className="text-sm text-slate-600">{sectionsOpen.costs ? "Hide" : "Show"}</span>
            </button>
            {sectionsOpen.costs && (
              <div className="mt-4">
                {canManageCosts && (
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <article className="rounded border p-4">
                      <h3 className="text-lg font-semibold">Add Material</h3>
                      <form className="mt-3 space-y-2" onSubmit={createMaterial}>
                        <label className="grid gap-1 text-sm">
                          <span className="text-slate-600">Description</span>
                          <input
                            placeholder="Description"
                            className="rounded border px-3 py-2 w-full"
                            value={materialForm.description}
                            onChange={(e) =>
                              setMaterialForm((prev) => ({ ...prev, description: e.target.value }))
                            }
                            required
                          />
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <label className="grid gap-1 text-sm">
                            <span className="text-slate-600">Quantity</span>
                            <input
                              type="number"
                              step="0.001"
                              className="rounded border px-3 py-2"
                              value={materialForm.quantity}
                              onChange={(e) =>
                                setMaterialForm((prev) => ({ ...prev, quantity: e.target.value }))
                              }
                              required
                            />
                          </label>
                          <label className="grid gap-1 text-sm">
                            <span className="text-slate-600">Unit Cost</span>
                            <input
                              type="number"
                              step="0.01"
                              className="rounded border px-3 py-2"
                              value={materialForm.unitCost}
                              onChange={(e) =>
                                setMaterialForm((prev) => ({ ...prev, unitCost: e.target.value }))
                              }
                              required
                            />
                          </label>
                          <label className="grid gap-1 text-sm">
                            <span className="text-slate-600">Sales Tax Rate</span>
                            <input
                              type="number"
                              step="0.0001"
                              min="0"
                              max="1"
                              className="rounded border px-3 py-2"
                              value={materialForm.salesTaxRate}
                              onChange={(e) =>
                                setMaterialForm((prev) => ({ ...prev, salesTaxRate: e.target.value }))
                              }
                              required
                            />
                          </label>
                        </div>
                        <button
                          type="submit"
                          disabled={saving}
                          className="rounded bg-fsm-accent text-white px-3 py-2 text-sm hover:bg-fsm-accentDark disabled:opacity-50"
                        >
                          Save Material
                        </button>
                      </form>
                    </article>

                    <article className="rounded border p-4">
                      <h3 className="text-lg font-semibold">Add Vendor Invoice</h3>
                      <form className="mt-3 space-y-2" onSubmit={createVendor}>
                        <label className="grid gap-1 text-sm">
                          <span className="text-slate-600">Vendor Name</span>
                          <input
                            placeholder="Vendor Name"
                            className="rounded border px-3 py-2 w-full"
                            value={vendorForm.vendorName}
                            onChange={(e) =>
                              setVendorForm((prev) => ({ ...prev, vendorName: e.target.value }))
                            }
                            required
                          />
                        </label>
                        <label className="grid gap-1 text-sm">
                          <span className="text-slate-600">Invoice Number</span>
                          <input
                            placeholder="Invoice Number"
                            className="rounded border px-3 py-2 w-full"
                            value={vendorForm.invoiceNumber}
                            onChange={(e) =>
                              setVendorForm((prev) => ({ ...prev, invoiceNumber: e.target.value }))
                            }
                            required
                          />
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="grid gap-1 text-sm">
                            <span className="text-slate-600">Amount</span>
                            <input
                              type="number"
                              step="0.01"
                              className="rounded border px-3 py-2"
                              value={vendorForm.amount}
                              onChange={(e) =>
                                setVendorForm((prev) => ({ ...prev, amount: e.target.value }))
                              }
                              required
                            />
                          </label>
                          <label className="grid gap-1 text-sm">
                            <span className="text-slate-600">Sales Tax Rate</span>
                            <input
                              type="number"
                              step="0.0001"
                              min="0"
                              max="1"
                              className="rounded border px-3 py-2"
                              value={vendorForm.salesTaxRate}
                              onChange={(e) =>
                                setVendorForm((prev) => ({ ...prev, salesTaxRate: e.target.value }))
                              }
                              required
                            />
                          </label>
                        </div>
                        <button
                          type="submit"
                          disabled={saving}
                          className="rounded bg-fsm-accent text-white px-3 py-2 text-sm hover:bg-fsm-accentDark disabled:opacity-50"
                        >
                          Save Vendor Invoice
                        </button>
                      </form>
                    </article>
                  </div>
                )}
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div className="rounded border p-3">
                    <p className="font-semibold">Material</p>
                    <p>Subtotal: {currency(totals.material.subtotal)}</p>
                    <p>Tax: {currency(totals.material.tax)}</p>
                    <p>Total: {currency(totals.material.total)}</p>
                  </div>
                  <div className="rounded border p-3">
                    <p className="font-semibold">Vendor</p>
                    <p>Subtotal: {currency(totals.vendor.subtotal)}</p>
                    <p>Tax: {currency(totals.vendor.tax)}</p>
                    <p>Total: {currency(totals.vendor.total)}</p>
                  </div>
                  <div className="rounded border p-3 bg-slate-50">
                    <p className="font-semibold">Combined</p>
                    <p>Subtotal: {currency(totals.combined.subtotal)}</p>
                    <p>Tax: {currency(totals.combined.tax)}</p>
                    <p>Total: {currency(totals.combined.total)}</p>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-fsm-panel shadow p-6">
            <button
              type="button"
              className="w-full flex items-center justify-between text-left"
              onClick={() => toggleSection("labor")}
              aria-expanded={sectionsOpen.labor}
            >
              <h2 className="text-xl font-semibold">Labor</h2>
              <span className="text-sm text-slate-600">{sectionsOpen.labor ? "Hide" : "Show"}</span>
            </button>
            {sectionsOpen.labor && (
              <div className="mt-4">
                {canCreateLaborOrAttachments && (
                  <form className="grid md:grid-cols-4 gap-3 mb-6" onSubmit={createLaborEntry}>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      className="rounded border px-3 py-2"
                      value={laborForm.hours}
                      onChange={(e) => setLaborForm((prev) => ({ ...prev, hours: e.target.value }))}
                      required
                    />
                    {isManagerOrAdmin && (
                      <select
                        className="rounded border px-3 py-2"
                        value={laborForm.technicianId}
                        onChange={(e) =>
                          setLaborForm((prev) => ({ ...prev, technicianId: e.target.value }))
                        }
                        required
                      >
                        {technicians.map((technician) => (
                          <option key={technician.id} value={technician.id}>
                            {technician.full_name} ({technician.email})
                          </option>
                        ))}
                      </select>
                    )}
                    <input
                      type="date"
                      className="rounded border px-3 py-2"
                      value={laborForm.entryDate}
                      onChange={(e) => setLaborForm((prev) => ({ ...prev, entryDate: e.target.value }))}
                      required
                    />
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded bg-fsm-accent text-white px-3 py-2 text-sm hover:bg-fsm-accentDark disabled:opacity-50"
                    >
                      Add Entry
                    </button>
                  </form>
                )}
                {labor.length === 0 ? (
                  <p className="text-slate-600">No labor entries linked to this work order.</p>
                ) : (
                  <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left border-b">
                          <th className="py-2 pr-3">Date</th>
                          <th className="py-2 pr-3">Hours</th>
                          <th className="py-2 pr-3">Type</th>
                          <th className="py-2 pr-3">Technician</th>
                        </tr>
                      </thead>
                      <tbody>
                        {labor.map((entry) => (
                          <tr key={entry.id} className="border-b last:border-0">
                            <td className="py-2 pr-3">{entry.entry_date}</td>
                            <td className="py-2 pr-3">{Number(entry.hours).toFixed(2)}</td>
                            <td className="py-2 pr-3">{entry.entry_type}</td>
                            <td className="py-2 pr-3">
                              {resolveTechnicianLabel(entry.technician_id, entry.technician_name)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-fsm-panel shadow p-6">
            <button
              type="button"
              className="w-full flex items-center justify-between text-left"
              onClick={() => toggleSection("attachments")}
              aria-expanded={sectionsOpen.attachments}
            >
              <h2 className="text-xl font-semibold">Attachments</h2>
              <span className="text-sm text-slate-600">{sectionsOpen.attachments ? "Hide" : "Show"}</span>
            </button>
            {sectionsOpen.attachments && (
              <div className="mt-4">
                {canCreateLaborOrAttachments && (
                  <form className="grid md:grid-cols-4 gap-3 mb-6" onSubmit={uploadAttachment}>
                    <input
                      className="rounded border px-3 py-2 bg-slate-50"
                      value="WORK_ORDER"
                      readOnly
                    />
                    <input
                      className="rounded border px-3 py-2 bg-slate-50"
                      value={workOrder ? `WO-${workOrder.wo_number} | ${workOrder.title}` : ""}
                      readOnly
                    />
                    <input
                      type="file"
                      className="rounded border px-3 py-2"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      required
                    />
                    <button
                      type="submit"
                      disabled={saving || !file}
                      className="rounded bg-fsm-accent text-white px-3 py-2 text-sm hover:bg-fsm-accentDark disabled:opacity-50"
                    >
                      Upload
                    </button>
                  </form>
                )}
                {attachments.length === 0 ? (
                  <p className="text-slate-600">No attachments linked to this work order.</p>
                ) : (
                  <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left border-b">
                          <th className="py-2 pr-3">File Name</th>
                          <th className="py-2 pr-3">Type</th>
                          <th className="py-2 pr-3">Size</th>
                          <th className="py-2 pr-3">Uploaded</th>
                          <th className="py-2 pr-3">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attachments.map((item) => (
                          <tr key={item.id} className="border-b last:border-0">
                            <td className="py-2 pr-3">{item.original_file_name}</td>
                            <td className="py-2 pr-3">{item.mime_type}</td>
                            <td className="py-2 pr-3">{item.file_size}</td>
                            <td className="py-2 pr-3">{new Date(item.created_at).toLocaleString()}</td>
                            <td className="py-2 pr-3">
                              <button
                                className="rounded border px-2 py-1 hover:bg-slate-50"
                                onClick={() => void downloadAttachment(item)}
                              >
                                Download
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-fsm-panel shadow p-6">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={generatePdfReport}
                className="rounded bg-fsm-accent text-white px-4 py-2 text-sm hover:bg-fsm-accentDark"
              >
                Generate Work Order PDF
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-2 text-right">
              Opens a print-ready report. Choose "Save as PDF" in the print dialog.
            </p>
          </section>
        </>
      )}
    </AppShell>
  );
};
