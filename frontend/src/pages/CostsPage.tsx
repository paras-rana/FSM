import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../components/AppShell";
import { api } from "../modules/api/client";
import { useAuth } from "../modules/auth/AuthContext";
import { hasAnyRole } from "../modules/auth/roles";
import type { CostTotals, MaterialItem, VendorInvoiceItem, WorkOrder } from "../types";

const currency = (value: number): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));

export const CostsPage = () => {
  const { user } = useAuth();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [selectedWoId, setSelectedWoId] = useState("");
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [vendors, setVendors] = useState<VendorInvoiceItem[]>([]);
  const [totals, setTotals] = useState<CostTotals | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const canManage = useMemo(
    () => hasAnyRole(user?.roles, ["MANAGER", "ADMIN"]),
    [user?.roles]
  );

  const loadWorkOrders = async () => {
    const res = await api.get<WorkOrder[]>("/work-orders?limit=100");
    setWorkOrders(res.data);
    if (!selectedWoId && res.data.length > 0) {
      setSelectedWoId(res.data[0].id);
    }
  };

  const loadCosts = async (workOrderId: string) => {
    const params = new URLSearchParams({ workOrderId });
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    const qs = params.toString();
    const [matRes, venRes, totalRes] = await Promise.all([
      api.get<MaterialItem[]>(`/costs/materials?${qs}`),
      api.get<VendorInvoiceItem[]>(`/costs/vendor-invoices?${qs}`),
      api.get<CostTotals>(`/costs/totals?${qs}`)
    ]);
    setMaterials(matRes.data);
    setVendors(venRes.data);
    setTotals(totalRes.data);
  };

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        await loadWorkOrders();
      } catch {
        setError("Failed to load work orders.");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  useEffect(() => {
    if (!selectedWoId) return;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        await loadCosts(selectedWoId);
      } catch {
        setError("Failed to load cost data.");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [selectedWoId, fromDate, toDate]);

  const createMaterial = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManage || !selectedWoId) return;
    try {
      await api.post("/costs/materials", {
        workOrderId: selectedWoId,
        description: materialForm.description,
        quantity: Number(materialForm.quantity),
        unitCost: Number(materialForm.unitCost),
        salesTaxRate: Number(materialForm.salesTaxRate)
      });
      setMaterialForm({ description: "", quantity: "1", unitCost: "0", salesTaxRate: "0.1" });
      await loadCosts(selectedWoId);
    } catch {
      setError("Failed to create material entry.");
    }
  };

  const createVendor = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManage || !selectedWoId) return;
    try {
      await api.post("/costs/vendor-invoices", {
        workOrderId: selectedWoId,
        vendorName: vendorForm.vendorName,
        invoiceNumber: vendorForm.invoiceNumber,
        amount: Number(vendorForm.amount),
        salesTaxRate: Number(vendorForm.salesTaxRate)
      });
      setVendorForm({ vendorName: "", invoiceNumber: "", amount: "0", salesTaxRate: "0.1" });
      await loadCosts(selectedWoId);
    } catch {
      setError("Failed to create vendor invoice.");
    }
  };

  return (
    <AppShell title="Costs">
      <section className="rounded-2xl bg-fsm-panel shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Work Order Selection</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <label className="grid gap-1">
            <span className="text-sm text-slate-600">Work Order</span>
            <select
              className="rounded border px-3 py-2 min-w-80"
              value={selectedWoId}
              onChange={(e) => setSelectedWoId(e.target.value)}
            >
              {workOrders.map((wo) => (
                <option key={wo.id} value={wo.id}>
                  WO-{wo.wo_number} | {wo.title}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-slate-600">From</span>
            <input
              type="date"
              className="rounded border px-3 py-2"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-slate-600">To</span>
            <input
              type="date"
              className="rounded border px-3 py-2"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </label>
          <button
            className="rounded border px-3 py-2 text-sm hover:bg-slate-50"
            onClick={() => {
              setFromDate("");
              setToDate("");
            }}
          >
            Clear Dates
          </button>
        </div>
      </section>

      {canManage && selectedWoId && (
        <section className="grid md:grid-cols-2 gap-6">
          <article className="rounded-2xl bg-fsm-panel shadow p-6">
            <h3 className="text-lg font-semibold">Add Material</h3>
            <form className="mt-3 space-y-2" onSubmit={createMaterial}>
              <input
                placeholder="Description"
                className="rounded border px-3 py-2 w-full"
                value={materialForm.description}
                onChange={(e) => setMaterialForm((p) => ({ ...p, description: e.target.value }))}
                required
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  step="0.001"
                  className="rounded border px-3 py-2"
                  value={materialForm.quantity}
                  onChange={(e) => setMaterialForm((p) => ({ ...p, quantity: e.target.value }))}
                  required
                />
                <input
                  type="number"
                  step="0.01"
                  className="rounded border px-3 py-2"
                  value={materialForm.unitCost}
                  onChange={(e) => setMaterialForm((p) => ({ ...p, unitCost: e.target.value }))}
                  required
                />
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  max="1"
                  className="rounded border px-3 py-2"
                  value={materialForm.salesTaxRate}
                  onChange={(e) => setMaterialForm((p) => ({ ...p, salesTaxRate: e.target.value }))}
                  required
                />
              </div>
              <button className="rounded bg-fsm-accent text-white px-3 py-2 text-sm hover:bg-fsm-accentDark">
                Save Material
              </button>
            </form>
          </article>

          <article className="rounded-2xl bg-fsm-panel shadow p-6">
            <h3 className="text-lg font-semibold">Add Vendor Invoice</h3>
            <form className="mt-3 space-y-2" onSubmit={createVendor}>
              <input
                placeholder="Vendor Name"
                className="rounded border px-3 py-2 w-full"
                value={vendorForm.vendorName}
                onChange={(e) => setVendorForm((p) => ({ ...p, vendorName: e.target.value }))}
                required
              />
              <input
                placeholder="Invoice Number"
                className="rounded border px-3 py-2 w-full"
                value={vendorForm.invoiceNumber}
                onChange={(e) => setVendorForm((p) => ({ ...p, invoiceNumber: e.target.value }))}
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.01"
                  className="rounded border px-3 py-2"
                  value={vendorForm.amount}
                  onChange={(e) => setVendorForm((p) => ({ ...p, amount: e.target.value }))}
                  required
                />
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  max="1"
                  className="rounded border px-3 py-2"
                  value={vendorForm.salesTaxRate}
                  onChange={(e) => setVendorForm((p) => ({ ...p, salesTaxRate: e.target.value }))}
                  required
                />
              </div>
              <button className="rounded bg-fsm-accent text-white px-3 py-2 text-sm hover:bg-fsm-accentDark">
                Save Vendor Invoice
              </button>
            </form>
          </article>
        </section>
      )}

      <section className="rounded-2xl bg-fsm-panel shadow p-6">
        <h2 className="text-xl font-semibold mb-2">Cost Totals</h2>
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        {loading || !totals ? (
          <p className="text-slate-600">Loading...</p>
        ) : (
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="rounded border p-3">
              <p className="font-semibold mb-1">Material</p>
              <p>Subtotal: {currency(totals.material.subtotal)}</p>
              <p>Tax: {currency(totals.material.tax)}</p>
              <p>Total: {currency(totals.material.total)}</p>
            </div>
            <div className="rounded border p-3">
              <p className="font-semibold mb-1">Vendor</p>
              <p>Subtotal: {currency(totals.vendor.subtotal)}</p>
              <p>Tax: {currency(totals.vendor.tax)}</p>
              <p>Total: {currency(totals.vendor.total)}</p>
            </div>
            <div className="rounded border p-3 bg-slate-50">
              <p className="font-semibold mb-1">Combined</p>
              <p>Subtotal: {currency(totals.combined.subtotal)}</p>
              <p>Tax: {currency(totals.combined.tax)}</p>
              <p>Total: {currency(totals.combined.total)}</p>
            </div>
          </div>
        )}
      </section>

      <section className="grid md:grid-cols-2 gap-6">
        <article className="rounded-2xl bg-fsm-panel shadow p-6">
          <h3 className="text-lg font-semibold mb-3">Materials</h3>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-2">Description</th>
                  <th className="py-2 pr-2">Qty</th>
                  <th className="py-2 pr-2">Unit</th>
                  <th className="py-2 pr-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-2 pr-2">{item.description}</td>
                    <td className="py-2 pr-2">{Number(item.quantity)}</td>
                    <td className="py-2 pr-2">{currency(item.unit_cost)}</td>
                    <td className="py-2 pr-2">{currency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-2xl bg-fsm-panel shadow p-6">
          <h3 className="text-lg font-semibold mb-3">Vendor Invoices</h3>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-2">Vendor</th>
                  <th className="py-2 pr-2">Invoice #</th>
                  <th className="py-2 pr-2">Amount</th>
                  <th className="py-2 pr-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-2 pr-2">{item.vendor_name}</td>
                    <td className="py-2 pr-2">{item.invoice_number}</td>
                    <td className="py-2 pr-2">{currency(item.amount)}</td>
                    <td className="py-2 pr-2">{currency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </AppShell>
  );
};
