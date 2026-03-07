import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../components/AppShell";
import { api } from "../modules/api/client";
import { useAuth } from "../modules/auth/AuthContext";
import { hasAnyRole } from "../modules/auth/roles";
import type { WorkOrder } from "../types";

const currency = (value: number): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
const toYmd = (value: Date) => value.toISOString().slice(0, 10);
const today = new Date();
const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
const defaultFrom = toYmd(new Date(today.getFullYear(), today.getMonth(), 1));
const defaultTo = toYmd(today);

type FilterMode = "month" | "range";
type TechnicianOption = { id: string; full_name: string; email: string };
type LaborEntryReportRow = {
  id: string;
  work_order_number?: number | null;
  technician_name?: string | null;
  entry_type: string;
  hours: number;
  entry_date: string;
  created_at: string;
};
type LaborSummaryReportRow = {
  technician_id: string;
  technician_name?: string | null;
  entry_type: string;
  total_hours: number;
};
type LaborReportResponse = {
  range: { from: string; to: string };
  totals: { totalHours: number };
  entries: LaborEntryReportRow[];
  summary: LaborSummaryReportRow[];
};
type CostLineMaterial = {
  id: string;
  work_order_number?: number | null;
  description: string;
  quantity: number;
  unit_cost: number;
  sales_tax_rate: number;
  subtotal: number;
  tax: number;
  total: number;
  created_by_name?: string | null;
  created_at: string;
};
type CostLineVendor = {
  id: string;
  work_order_number?: number | null;
  vendor_name: string;
  invoice_number: string;
  amount: number;
  sales_tax_rate: number;
  subtotal: number;
  tax: number;
  total: number;
  created_by_name?: string | null;
  created_at: string;
};
type CostReportResponse = {
  range: { from: string; to: string };
  totals: {
    material: { subtotal: number; tax: number; total: number };
    vendor: { subtotal: number; tax: number; total: number };
    combined: { subtotal: number; tax: number; total: number };
  };
  materials: CostLineMaterial[];
  vendorInvoices: CostLineVendor[];
};

const escapeCsv = (value: unknown): string => {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

const csvFromRows = (headers: string[], rows: Array<Array<unknown>>): string => {
  const headerLine = headers.map(escapeCsv).join(",");
  const body = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  return `${headerLine}\n${body}`;
};

const downloadFile = (content: string, mimeType: string, fileName: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

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
    throw new Error("Popup blocked. Allow popups for reports.");
  }
  popup.opener = null;
  return popup;
};

const renderReportWindow = (popup: Window, title: string, bodyHtml: string, printOnLoad = false) => {
  popup.document.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
      h1 { margin: 0 0 12px; font-size: 22px; }
      h2 { margin: 20px 0 8px; font-size: 16px; }
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
  if (printOnLoad) {
    setTimeout(() => popup.print(), 250);
  }
};

const buildRangeParams = (mode: FilterMode, month: string, from: string, to: string): URLSearchParams => {
  const params = new URLSearchParams();
  if (mode === "month") {
    params.set("month", month);
  } else {
    params.set("from", from);
    params.set("to", to);
  }
  return params;
};

const buildLaborReportHtml = (data: LaborReportResponse) => {
  const summaryRows = data.summary
    .map(
      (row) =>
        `<tr><td>${escapeHtml(row.technician_name ?? "Unknown Technician")}</td><td>${escapeHtml(
          row.entry_type
        )}</td><td>${Number(row.total_hours).toFixed(2)}</td></tr>`
    )
    .join("");
  const detailRows = data.entries
    .map(
      (entry) =>
        `<tr><td>${escapeHtml(entry.entry_date)}</td><td>${escapeHtml(
          entry.work_order_number ? `WO-${entry.work_order_number}` : "-"
        )}</td><td>${escapeHtml(entry.technician_name ?? "Unknown Technician")}</td><td>${escapeHtml(
          entry.entry_type
        )}</td><td>${Number(entry.hours).toFixed(2)}</td></tr>`
    )
    .join("");

  return `<h1>Labor Report</h1>
    <p class="meta">Range: ${escapeHtml(data.range.from)} to ${escapeHtml(data.range.to)}</p>
    <p class="meta">Total Hours: ${Number(data.totals.totalHours).toFixed(2)}</p>
    <h2>Summary by Technician + Type</h2>
    <table><thead><tr><th>Technician</th><th>Type</th><th>Total Hours</th></tr></thead><tbody>${summaryRows}</tbody></table>
    <h2>Labor Line Detail</h2>
    <table><thead><tr><th>Date</th><th>Work Order</th><th>Technician</th><th>Type</th><th>Hours</th></tr></thead><tbody>${detailRows}</tbody></table>`;
};

const buildCostReportHtml = (data: CostReportResponse) => {
  const materialRows = data.materials
    .map(
      (row) =>
        `<tr><td>${escapeHtml(new Date(row.created_at).toLocaleDateString())}</td><td>${escapeHtml(
          row.work_order_number ? `WO-${row.work_order_number}` : "-"
        )}</td><td>${escapeHtml(row.description)}</td><td>${Number(row.quantity).toFixed(
          3
        )}</td><td>${currency(Number(row.unit_cost))}</td><td>${currency(Number(row.tax))}</td><td>${currency(
          Number(row.total)
        )}</td></tr>`
    )
    .join("");
  const vendorRows = data.vendorInvoices
    .map(
      (row) =>
        `<tr><td>${escapeHtml(new Date(row.created_at).toLocaleDateString())}</td><td>${escapeHtml(
          row.work_order_number ? `WO-${row.work_order_number}` : "-"
        )}</td><td>${escapeHtml(row.vendor_name)}</td><td>${escapeHtml(
          row.invoice_number
        )}</td><td>${currency(Number(row.amount))}</td><td>${currency(Number(row.tax))}</td><td>${currency(
          Number(row.total)
        )}</td></tr>`
    )
    .join("");

  return `<h1>Cost Report</h1>
    <p class="meta">Range: ${escapeHtml(data.range.from)} to ${escapeHtml(data.range.to)}</p>
    <p class="meta">Material Total: ${currency(data.totals.material.total)}</p>
    <p class="meta">Vendor Total: ${currency(data.totals.vendor.total)}</p>
    <p class="meta">Combined Total: ${currency(data.totals.combined.total)}</p>
    <h2>Material Line Detail</h2>
    <table><thead><tr><th>Created</th><th>Work Order</th><th>Description</th><th>Qty</th><th>Unit Cost</th><th>Tax</th><th>Total</th></tr></thead><tbody>${materialRows}</tbody></table>
    <h2>Vendor Invoice Line Detail</h2>
    <table><thead><tr><th>Created</th><th>Work Order</th><th>Vendor</th><th>Invoice #</th><th>Amount</th><th>Tax</th><th>Total</th></tr></thead><tbody>${vendorRows}</tbody></table>`;
};

export const ReportsPage = () => {
  const { user } = useAuth();
  const canChooseTechnician = useMemo(
    () => hasAnyRole(user?.roles, ["MANAGER", "ADMIN"]),
    [user?.roles]
  );

  const [technicianId, setTechnicianId] = useState("");
  const [workOrderId, setWorkOrderId] = useState("");
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);

  const [laborFilterMode, setLaborFilterMode] = useState<FilterMode>("month");
  const [laborMonth, setLaborMonth] = useState(currentMonth);
  const [laborFrom, setLaborFrom] = useState(defaultFrom);
  const [laborTo, setLaborTo] = useState(defaultTo);
  const [laborLoading, setLaborLoading] = useState(false);
  const [laborError, setLaborError] = useState<string | null>(null);

  const [costFilterMode, setCostFilterMode] = useState<FilterMode>("month");
  const [costMonth, setCostMonth] = useState(currentMonth);
  const [costFrom, setCostFrom] = useState(defaultFrom);
  const [costTo, setCostTo] = useState(defaultTo);
  const [costLoading, setCostLoading] = useState(false);
  const [costError, setCostError] = useState<string | null>(null);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const workOrdersResponse = await api.get<WorkOrder[]>("/work-orders?limit=300");
        setWorkOrders(workOrdersResponse.data);
        if (canChooseTechnician) {
          const techniciansResponse = await api.get<TechnicianOption[]>("/labor-entries/technicians");
          setTechnicians(techniciansResponse.data);
        } else {
          setTechnicians([]);
          setTechnicianId("");
        }
      } catch {
        setLaborError("Failed to load report filters.");
        setCostError("Failed to load report filters.");
      }
    };
    void loadLookups();
  }, [canChooseTechnician]);

  const fetchLaborReport = async (): Promise<LaborReportResponse> => {
    const params = buildRangeParams(laborFilterMode, laborMonth, laborFrom, laborTo);
    if (canChooseTechnician && technicianId) {
      params.set("technicianId", technicianId);
    }
    const response = await api.get<LaborReportResponse>(`/reports/labor-details?${params.toString()}`);
    return response.data;
  };

  const fetchCostReport = async (): Promise<CostReportResponse> => {
    const params = buildRangeParams(costFilterMode, costMonth, costFrom, costTo);
    if (workOrderId) {
      params.set("workOrderId", workOrderId);
    }
    const response = await api.get<CostReportResponse>(`/reports/cost-details?${params.toString()}`);
    return response.data;
  };

  const runLaborOnScreen = async (popup: Window) => {
    setLaborLoading(true);
    setLaborError(null);
    try {
      popup.document.write("<p style='font-family: Arial, sans-serif; margin: 24px;'>Loading labor report...</p>");
      popup.document.close();
      const data = await fetchLaborReport();
      renderReportWindow(popup, `Labor Report ${data.range.from} to ${data.range.to}`, buildLaborReportHtml(data));
    } catch (error) {
      popup?.close();
      const message = error instanceof Error ? error.message : "Failed to run labor report.";
      setLaborError(message);
    } finally {
      setLaborLoading(false);
    }
  };

  const runCostOnScreen = async (popup: Window) => {
    setCostLoading(true);
    setCostError(null);
    try {
      popup.document.write("<p style='font-family: Arial, sans-serif; margin: 24px;'>Loading cost report...</p>");
      popup.document.close();
      const data = await fetchCostReport();
      renderReportWindow(popup, `Cost Report ${data.range.from} to ${data.range.to}`, buildCostReportHtml(data));
    } catch (error) {
      popup?.close();
      const message = error instanceof Error ? error.message : "Failed to run cost report.";
      setCostError(message);
    } finally {
      setCostLoading(false);
    }
  };

  const exportLaborCsv = async () => {
    setLaborLoading(true);
    setLaborError(null);
    try {
      const data = await fetchLaborReport();
      const summaryCsv = csvFromRows(
        ["Technician", "Type", "Total Hours"],
        data.summary.map((row) => [row.technician_name ?? "Unknown Technician", row.entry_type, row.total_hours])
      );
      const detailCsv = csvFromRows(
        ["Date", "Work Order", "Technician", "Type", "Hours", "Created At"],
        data.entries.map((entry) => [
          entry.entry_date,
          entry.work_order_number ? `WO-${entry.work_order_number}` : "-",
          entry.technician_name ?? "Unknown Technician",
          entry.entry_type,
          Number(entry.hours).toFixed(2),
          new Date(entry.created_at).toISOString()
        ])
      );
      const content = [
        "Labor Report",
        `Range,${data.range.from} to ${data.range.to}`,
        `Total Hours,${Number(data.totals.totalHours).toFixed(2)}`,
        "",
        "Summary by Technician + Type",
        summaryCsv,
        "",
        "Labor Line Detail",
        detailCsv
      ].join("\n");
      downloadFile(content, "text/csv;charset=utf-8;", `labor-report-${data.range.from}-to-${data.range.to}.csv`);
    } catch {
      setLaborError("Failed to export labor CSV. Check filters and try again.");
    } finally {
      setLaborLoading(false);
    }
  };

  const exportCostCsv = async () => {
    setCostLoading(true);
    setCostError(null);
    try {
      const data = await fetchCostReport();
      const materialCsv = csvFromRows(
        ["Created", "Work Order", "Description", "Qty", "Unit Cost", "Tax", "Total"],
        data.materials.map((row) => [
          new Date(row.created_at).toLocaleDateString(),
          row.work_order_number ? `WO-${row.work_order_number}` : "-",
          row.description,
          Number(row.quantity).toFixed(3),
          Number(row.unit_cost).toFixed(2),
          Number(row.tax).toFixed(2),
          Number(row.total).toFixed(2)
        ])
      );
      const vendorCsv = csvFromRows(
        ["Created", "Work Order", "Vendor", "Invoice #", "Amount", "Tax", "Total"],
        data.vendorInvoices.map((row) => [
          new Date(row.created_at).toLocaleDateString(),
          row.work_order_number ? `WO-${row.work_order_number}` : "-",
          row.vendor_name,
          row.invoice_number,
          Number(row.amount).toFixed(2),
          Number(row.tax).toFixed(2),
          Number(row.total).toFixed(2)
        ])
      );
      const content = [
        "Cost Report",
        `Range,${data.range.from} to ${data.range.to}`,
        `Material Total,${Number(data.totals.material.total).toFixed(2)}`,
        `Vendor Total,${Number(data.totals.vendor.total).toFixed(2)}`,
        `Combined Total,${Number(data.totals.combined.total).toFixed(2)}`,
        "",
        "Material Line Detail",
        materialCsv,
        "",
        "Vendor Invoice Line Detail",
        vendorCsv
      ].join("\n");
      downloadFile(content, "text/csv;charset=utf-8;", `cost-report-${data.range.from}-to-${data.range.to}.csv`);
    } catch {
      setCostError("Failed to export cost CSV. Check filters and try again.");
    } finally {
      setCostLoading(false);
    }
  };

  const exportLaborPdf = async (popup: Window) => {
    setLaborLoading(true);
    setLaborError(null);
    try {
      popup.document.write("<p style='font-family: Arial, sans-serif; margin: 24px;'>Preparing PDF...</p>");
      popup.document.close();
      const data = await fetchLaborReport();
      renderReportWindow(
        popup,
        `Labor Report ${data.range.from} to ${data.range.to}`,
        buildLaborReportHtml(data),
        true
      );
    } catch (error) {
      popup?.close();
      const message = error instanceof Error ? error.message : "Failed to export labor PDF.";
      setLaborError(message);
    } finally {
      setLaborLoading(false);
    }
  };

  const exportCostPdf = async (popup: Window) => {
    setCostLoading(true);
    setCostError(null);
    try {
      popup.document.write("<p style='font-family: Arial, sans-serif; margin: 24px;'>Preparing PDF...</p>");
      popup.document.close();
      const data = await fetchCostReport();
      renderReportWindow(
        popup,
        `Cost Report ${data.range.from} to ${data.range.to}`,
        buildCostReportHtml(data),
        true
      );
    } catch (error) {
      popup?.close();
      const message = error instanceof Error ? error.message : "Failed to export cost PDF.";
      setCostError(message);
    } finally {
      setCostLoading(false);
    }
  };

  return (
    <AppShell title="Reports">
      <section className="rounded-2xl bg-fsm-panel shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Labor Report Parameters</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 items-end">
          <label className="grid gap-1 min-w-0">
            <span className="text-sm text-slate-700">Mode</span>
            <select
              className="rounded border px-3 py-2 w-full min-w-0"
              value={laborFilterMode}
              onChange={(e) => setLaborFilterMode(e.target.value as FilterMode)}
            >
              <option value="month">By Month</option>
              <option value="range">By Date Range</option>
            </select>
          </label>
          {laborFilterMode === "month" ? (
            <label className="grid gap-1 min-w-0">
              <span className="text-sm text-slate-700">Month</span>
              <input
                type="month"
                className="rounded border px-3 py-2 w-full min-w-0"
                value={laborMonth}
                onChange={(e) => setLaborMonth(e.target.value)}
              />
            </label>
          ) : (
            <>
              <label className="grid gap-1 min-w-0">
                <span className="text-sm text-slate-700">From</span>
                <input
                  type="date"
                  className="rounded border px-3 py-2 w-full min-w-0"
                  value={laborFrom}
                  onChange={(e) => setLaborFrom(e.target.value)}
                />
              </label>
              <label className="grid gap-1 min-w-0">
                <span className="text-sm text-slate-700">To</span>
                <input
                  type="date"
                  className="rounded border px-3 py-2 w-full min-w-0"
                  value={laborTo}
                  onChange={(e) => setLaborTo(e.target.value)}
                />
              </label>
            </>
          )}
          {canChooseTechnician && (
            <label className="grid gap-1 min-w-0">
              <span className="text-sm text-slate-700">Technician</span>
              <select
                className="rounded border px-3 py-2 w-full min-w-0"
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
              >
                <option value="">All</option>
                {technicians.map((technician) => (
                  <option key={technician.id} value={technician.id}>
                    {technician.full_name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              try {
                const popup = createReportWindow();
                void runLaborOnScreen(popup);
              } catch (error) {
                const message = error instanceof Error ? error.message : "Popup blocked. Allow popups for reports.";
                setLaborError(message);
              }
            }}
            disabled={laborLoading}
            className="rounded bg-fsm-accent text-white px-4 py-2 text-sm hover:bg-fsm-accentDark disabled:opacity-50"
          >
            {laborLoading ? "Running..." : "Run On Screen"}
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                const popup = createReportWindow();
                void exportLaborPdf(popup);
              } catch (error) {
                const message = error instanceof Error ? error.message : "Popup blocked. Allow popups for reports.";
                setLaborError(message);
              }
            }}
            disabled={laborLoading}
            className="rounded border px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            Export PDF
          </button>
          <button
            type="button"
            onClick={() => void exportLaborCsv()}
            disabled={laborLoading}
            className="rounded border px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
        {laborError && <p className="text-sm text-red-600 mt-3">{laborError}</p>}
      </section>

      <section className="rounded-2xl bg-fsm-panel shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Cost Report Parameters</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 items-end">
          <label className="grid gap-1 min-w-0">
            <span className="text-sm text-slate-700">Mode</span>
            <select
              className="rounded border px-3 py-2 w-full min-w-0"
              value={costFilterMode}
              onChange={(e) => setCostFilterMode(e.target.value as FilterMode)}
            >
              <option value="month">By Month</option>
              <option value="range">By Date Range</option>
            </select>
          </label>
          {costFilterMode === "month" ? (
            <label className="grid gap-1 min-w-0">
              <span className="text-sm text-slate-700">Month</span>
              <input
                type="month"
                className="rounded border px-3 py-2 w-full min-w-0"
                value={costMonth}
                onChange={(e) => setCostMonth(e.target.value)}
              />
            </label>
          ) : (
            <>
              <label className="grid gap-1 min-w-0">
                <span className="text-sm text-slate-700">From</span>
                <input
                  type="date"
                  className="rounded border px-3 py-2 w-full min-w-0"
                  value={costFrom}
                  onChange={(e) => setCostFrom(e.target.value)}
                />
              </label>
              <label className="grid gap-1 min-w-0">
                <span className="text-sm text-slate-700">To</span>
                <input
                  type="date"
                  className="rounded border px-3 py-2 w-full min-w-0"
                  value={costTo}
                  onChange={(e) => setCostTo(e.target.value)}
                />
              </label>
            </>
          )}
          <label className="grid gap-1 min-w-0">
            <span className="text-sm text-slate-700">Work Order</span>
            <select
              className="rounded border px-3 py-2 w-full min-w-0"
              value={workOrderId}
              onChange={(e) => setWorkOrderId(e.target.value)}
            >
              <option value="">All</option>
              {workOrders.map((workOrder) => (
                <option key={workOrder.id} value={workOrder.id}>
                  WO-{workOrder.wo_number} | {workOrder.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              try {
                const popup = createReportWindow();
                void runCostOnScreen(popup);
              } catch (error) {
                const message = error instanceof Error ? error.message : "Popup blocked. Allow popups for reports.";
                setCostError(message);
              }
            }}
            disabled={costLoading}
            className="rounded bg-fsm-accent text-white px-4 py-2 text-sm hover:bg-fsm-accentDark disabled:opacity-50"
          >
            {costLoading ? "Running..." : "Run On Screen"}
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                const popup = createReportWindow();
                void exportCostPdf(popup);
              } catch (error) {
                const message = error instanceof Error ? error.message : "Popup blocked. Allow popups for reports.";
                setCostError(message);
              }
            }}
            disabled={costLoading}
            className="rounded border px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            Export PDF
          </button>
          <button
            type="button"
            onClick={() => void exportCostCsv()}
            disabled={costLoading}
            className="rounded border px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
        {costError && <p className="text-sm text-red-600 mt-3">{costError}</p>}
      </section>
    </AppShell>
  );
};
