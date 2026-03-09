import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../components/AppShell";
import { api } from "../modules/api/client";
import type {
  InventoryAvailablePart,
  InventoryListItem,
  InventoryLocation,
  InventoryTransactionItem
} from "../types";

type PurchaseForm = {
  partNumber: string;
  partName: string;
  quantity: string;
  locationId: string;
};

type TransferForm = {
  fromLocationId: string;
  toLocationId: string;
  partId: string;
  quantity: string;
};

const initialPurchaseForm: PurchaseForm = {
  partNumber: "",
  partName: "",
  quantity: "1",
  locationId: ""
};

const initialTransferForm: TransferForm = {
  fromLocationId: "",
  toLocationId: "",
  partId: "",
  quantity: "1"
};

export const InventoryPage = () => {
  const pageSize = 25;
  const [items, setItems] = useState<InventoryListItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransactionItem[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [availableFromParts, setAvailableFromParts] = useState<InventoryAvailablePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [filters, setFilters] = useState({ partName: "", locationId: "" });
  const [appliedFilters, setAppliedFilters] = useState({ partName: "", locationId: "" });

  const [showPurchaseOverlay, setShowPurchaseOverlay] = useState(false);
  const [showTransferOverlay, setShowTransferOverlay] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState<PurchaseForm>(initialPurchaseForm);
  const [transferForm, setTransferForm] = useState<TransferForm>(initialTransferForm);

  const loadTransactions = async (filterState = appliedFilters) => {
    const params = new URLSearchParams({ limit: "50", offset: "0" });
    if (filterState.partName.trim()) params.set("partName", filterState.partName.trim());
    if (filterState.locationId) params.set("locationId", filterState.locationId);
    const response = await api.get<InventoryTransactionItem[]>(`/inventory/transactions?${params.toString()}`);
    setTransactions(response.data);
  };

  const loadLocations = async () => {
    const response = await api.get<InventoryLocation[]>("/inventory/locations");
    setLocations(response.data);
    setPurchaseForm((prev) => ({
      ...prev,
      locationId: prev.locationId || response.data[0]?.id || ""
    }));
  };

  const loadInventory = async (page = currentPage, filterState = appliedFilters) => {
    setLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * pageSize;
      const params = new URLSearchParams({
        limit: String(pageSize + 1),
        offset: String(offset)
      });
      if (filterState.partName.trim()) params.set("partName", filterState.partName.trim());
      if (filterState.locationId) params.set("locationId", filterState.locationId);
      const response = await api.get<InventoryListItem[]>(`/inventory?${params.toString()}`);
      setHasNextPage(response.data.length > pageSize);
      setItems(response.data.slice(0, pageSize));
    } catch {
      setError("Failed to load inventory.");
      setHasNextPage(false);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        await loadLocations();
        await loadInventory(1, appliedFilters);
        await loadTransactions(appliedFilters);
      } catch {
        setError("Failed to load inventory data.");
      }
    };
    void load();
  }, []);

  useEffect(() => {
    const loadAvailable = async () => {
      if (!showTransferOverlay || !transferForm.fromLocationId) {
        setAvailableFromParts([]);
        return;
      }
      try {
        const response = await api.get<InventoryAvailablePart[]>(
          `/inventory/available-parts?locationId=${transferForm.fromLocationId}`
        );
        setAvailableFromParts(response.data);
        setTransferForm((prev) => ({
          ...prev,
          partId: response.data.some((item) => item.part_id === prev.partId) ? prev.partId : response.data[0]?.part_id ?? ""
        }));
      } catch {
        setAvailableFromParts([]);
      }
    };
    void loadAvailable();
  }, [showTransferOverlay, transferForm.fromLocationId]);

  const onSearch = async () => {
    const next = {
      partName: filters.partName.trim(),
      locationId: filters.locationId
    };
    setAppliedFilters(next);
    setCurrentPage(1);
    await loadInventory(1, next);
    await loadTransactions(next);
  };

  const onPageChange = async (page: number) => {
    if (page < 1) return;
    setCurrentPage(page);
    await loadInventory(page);
  };

  const savePurchase = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/inventory/purchases", {
        partNumber: purchaseForm.partNumber.trim(),
        partName: purchaseForm.partName.trim(),
        quantity: Number(purchaseForm.quantity),
        locationId: purchaseForm.locationId
      });
      setShowPurchaseOverlay(false);
      setPurchaseForm((prev) => ({ ...initialPurchaseForm, locationId: prev.locationId }));
      await loadInventory(currentPage);
      await loadTransactions();
    } catch {
      setError("Failed to record purchased item.");
    } finally {
      setSaving(false);
    }
  };

  const saveTransfer = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/inventory/transfers", {
        partId: transferForm.partId,
        fromLocationId: transferForm.fromLocationId,
        toLocationId: transferForm.toLocationId,
        quantity: Number(transferForm.quantity)
      });
      setShowTransferOverlay(false);
      setTransferForm(initialTransferForm);
      setAvailableFromParts([]);
      await loadInventory(currentPage);
      await loadTransactions();
    } catch {
      setError("Failed to transfer inventory item.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Inventory">
      <section className="rounded-2xl bg-fsm-panel shadow p-6">
        <div className="flex items-center justify-between mb-4 gap-3">
          <h2 className="text-xl font-semibold">Inventory</h2>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded bg-fsm-accent text-white px-4 py-2 text-sm hover:bg-fsm-accentDark"
              onClick={() => setShowPurchaseOverlay(true)}
            >
              Add Purchased Item
            </button>
            <button
              type="button"
              className="rounded border px-4 py-2 text-sm hover:bg-slate-50"
              onClick={() => setShowTransferOverlay(true)}
            >
              Transfer Items
            </button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <label className="grid gap-1">
            <span className="text-sm text-slate-700">Part Name / Number</span>
            <input
              type="text"
              className="rounded border px-3 py-2 min-w-[240px]"
              value={filters.partName}
              onChange={(e) => setFilters((prev) => ({ ...prev, partName: e.target.value }))}
              placeholder="Search by part name or number"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-slate-700">Warehouse / Van</span>
            <select
              className="rounded border px-3 py-2 min-w-[240px]"
              value={filters.locationId}
              onChange={(e) => setFilters((prev) => ({ ...prev, locationId: e.target.value }))}
            >
              <option value="">All Locations</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name} ({location.location_type === "WAREHOUSE" ? "Warehouse" : "Van"})
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="rounded bg-fsm-accent text-white px-4 py-2 text-sm hover:bg-fsm-accentDark"
            onClick={() => void onSearch()}
          >
            Search
          </button>
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        {loading ? (
          <p className="text-slate-600">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-slate-600">No inventory records found.</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Part #</th>
                  <th className="py-2 pr-3">Part Name</th>
                  <th className="py-2 pr-3">Location</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={`${item.part_id}-${item.location_id}`} className="border-b last:border-b-0">
                    <td className="py-2 pr-3">{item.part_number}</td>
                    <td className="py-2 pr-3">{item.part_name}</td>
                    <td className="py-2 pr-3">{item.location_name}</td>
                    <td className="py-2 pr-3">{item.location_type === "WAREHOUSE" ? "Warehouse" : "Van"}</td>
                    <td className="py-2 pr-3">{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-600">Page {currentPage}</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
              onClick={() => void onPageChange(currentPage - 1)}
              disabled={currentPage <= 1 || loading}
            >
              Previous
            </button>
            <button
              type="button"
              className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
              onClick={() => void onPageChange(currentPage + 1)}
              disabled={!hasNextPage || loading}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-fsm-panel shadow p-6">
        <h2 className="text-xl font-semibold mb-3">Inventory Activity</h2>
        {transactions.length === 0 ? (
          <p className="text-slate-600">No inventory transactions found.</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">When</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Part</th>
                  <th className="py-2 pr-3">From</th>
                  <th className="py-2 pr-3">To</th>
                  <th className="py-2 pr-3">Qty</th>
                  <th className="py-2 pr-3">Work Order</th>
                  <th className="py-2 pr-3">By</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr key={txn.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-3">{new Date(txn.created_at).toLocaleString()}</td>
                    <td className="py-2 pr-3">{txn.transaction_type}</td>
                    <td className="py-2 pr-3">
                      {txn.part_number} | {txn.part_name}
                    </td>
                    <td className="py-2 pr-3">{txn.from_location_name ?? "-"}</td>
                    <td className="py-2 pr-3">{txn.to_location_name ?? "-"}</td>
                    <td className="py-2 pr-3">{txn.quantity}</td>
                    <td className="py-2 pr-3">{txn.work_order_number ? `WO-${txn.work_order_number}` : "-"}</td>
                    <td className="py-2 pr-3">{txn.created_by_name ?? txn.created_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showPurchaseOverlay && (
        <div className="fixed inset-0 z-50 bg-black/30 flex justify-end">
          <button type="button" className="absolute inset-0" onClick={() => setShowPurchaseOverlay(false)} />
          <aside className="relative h-full w-full max-w-xl bg-white shadow-2xl p-6 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Purchased Item</h3>
              <button type="button" className="rounded border px-3 py-1.5 text-sm" onClick={() => setShowPurchaseOverlay(false)}>
                Close
              </button>
            </div>
            <form className="space-y-3" onSubmit={savePurchase}>
              <input
                className="rounded border px-3 py-2 w-full"
                placeholder="Part Number"
                value={purchaseForm.partNumber}
                onChange={(e) => setPurchaseForm((prev) => ({ ...prev, partNumber: e.target.value }))}
                required
              />
              <input
                className="rounded border px-3 py-2 w-full"
                placeholder="Part Name"
                value={purchaseForm.partName}
                onChange={(e) => setPurchaseForm((prev) => ({ ...prev, partName: e.target.value }))}
                required
              />
              <input
                type="number"
                min="1"
                step="1"
                className="rounded border px-3 py-2 w-full"
                placeholder="Quantity"
                value={purchaseForm.quantity}
                onChange={(e) => setPurchaseForm((prev) => ({ ...prev, quantity: e.target.value }))}
                required
              />
              <select
                className="rounded border px-3 py-2 w-full"
                value={purchaseForm.locationId}
                onChange={(e) => setPurchaseForm((prev) => ({ ...prev, locationId: e.target.value }))}
                required
              >
                <option value="">Select Warehouse / Van</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name} ({location.location_type === "WAREHOUSE" ? "Warehouse" : "Van"})
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={saving}
                className="rounded bg-fsm-accent text-white px-4 py-2 text-sm hover:bg-fsm-accentDark disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Purchase"}
              </button>
            </form>
          </aside>
        </div>
      )}

      {showTransferOverlay && (
        <div className="fixed inset-0 z-50 bg-black/30 flex justify-end">
          <button type="button" className="absolute inset-0" onClick={() => setShowTransferOverlay(false)} />
          <aside className="relative h-full w-full max-w-xl bg-white shadow-2xl p-6 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Transfer Inventory</h3>
              <button type="button" className="rounded border px-3 py-1.5 text-sm" onClick={() => setShowTransferOverlay(false)}>
                Close
              </button>
            </div>
            <form className="space-y-3" onSubmit={saveTransfer}>
              <select
                className="rounded border px-3 py-2 w-full"
                value={transferForm.fromLocationId}
                onChange={(e) =>
                  setTransferForm((prev) => ({ ...prev, fromLocationId: e.target.value, partId: "" }))
                }
                required
              >
                <option value="">From Warehouse / Van</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name} ({location.location_type === "WAREHOUSE" ? "Warehouse" : "Van"})
                  </option>
                ))}
              </select>
              <select
                className="rounded border px-3 py-2 w-full"
                value={transferForm.toLocationId}
                onChange={(e) => setTransferForm((prev) => ({ ...prev, toLocationId: e.target.value }))}
                required
              >
                <option value="">To Warehouse / Van</option>
                {locations
                  .filter((location) => location.id !== transferForm.fromLocationId)
                  .map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name} ({location.location_type === "WAREHOUSE" ? "Warehouse" : "Van"})
                    </option>
                  ))}
              </select>
              <select
                className="rounded border px-3 py-2 w-full"
                value={transferForm.partId}
                onChange={(e) => setTransferForm((prev) => ({ ...prev, partId: e.target.value }))}
                required
                disabled={!transferForm.fromLocationId}
              >
                <option value="">Select Part</option>
                {availableFromParts.map((part) => (
                  <option key={part.part_id} value={part.part_id}>
                    {part.part_number} | {part.part_name} (Available: {part.quantity})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                step="1"
                className="rounded border px-3 py-2 w-full"
                placeholder="Quantity"
                value={transferForm.quantity}
                onChange={(e) => setTransferForm((prev) => ({ ...prev, quantity: e.target.value }))}
                required
              />
              <button
                type="submit"
                disabled={saving}
                className="rounded bg-fsm-accent text-white px-4 py-2 text-sm hover:bg-fsm-accentDark disabled:opacity-50"
              >
                {saving ? "Transferring..." : "Transfer"}
              </button>
            </form>
          </aside>
        </div>
      )}
    </AppShell>
  );
};
