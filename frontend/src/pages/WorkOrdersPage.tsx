import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { api } from "../modules/api/client";
import { useAuth } from "../modules/auth/AuthContext";
import { hasAnyRole } from "../modules/auth/roles";
import { formatStatusLabel } from "../modules/status/format";
import type { Facility, WorkOrder } from "../types";

const statuses = [
  "CREATED",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_FOR_PARTS",
  "COMPLETED",
  "CHECKED_AND_CLOSED",
  "REOPENED",
  "ARCHIVED"
] as const;

const addDays = (rawDate: string, days: number): string => {
  const value = new Date(`${rawDate}T00:00:00`);
  if (Number.isNaN(value.getTime())) return rawDate;
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
};

export const WorkOrdersPage = () => {
  const pageSize = 25;
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [form, setForm] = useState({ title: "", description: "", facilityName: "", zoneName: "" });
  const [filters, setFilters] = useState({
    facilityName: "",
    status: "",
    updatedFrom: "",
    updatedTo: ""
  });

  const canManage = useMemo(
    () => hasAnyRole(user?.roles, ["MANAGER", "ADMIN"]),
    [user?.roles]
  );

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const pageRaw = Number(searchParams.get("page") ?? "1");
      const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
      const offset = (page - 1) * pageSize;
      const params = new URLSearchParams({ limit: String(pageSize + 1), offset: String(offset) });
      const status = searchParams.get("status");
      const excludeStatus = searchParams.get("excludeStatus");
      const leadTechnicianId = searchParams.get("leadTechnicianId");
      const updatedFrom = searchParams.get("updatedFrom");
      const updatedTo = searchParams.get("updatedTo");
      const facilityName = searchParams.get("facilityName");
      const assignedOnly = searchParams.get("assignedOnly");
      if (status) params.set("status", status);
      if (excludeStatus) params.set("excludeStatus", excludeStatus);
      if (leadTechnicianId) params.set("leadTechnicianId", leadTechnicianId);
      if (updatedFrom) params.set("updatedFrom", updatedFrom);
      if (updatedTo) params.set("updatedTo", updatedTo);
      if (facilityName) params.set("facilityName", facilityName);
      if (assignedOnly) params.set("assignedOnly", assignedOnly);
      const response = await api.get<WorkOrder[]>(`/work-orders?${params.toString()}`);
      setHasNextPage(response.data.length > pageSize);
      setWorkOrders(response.data.slice(0, pageSize));
    } catch {
      setError("Failed to load work orders.");
      setHasNextPage(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [searchParams]);

  useEffect(() => {
    const loadFacilities = async () => {
      try {
        const response = await api.get<Facility[]>("/facilities");
        setFacilities(response.data);
        setForm((prev) => {
          if (prev.facilityName || response.data.length === 0) return prev;
          const first = response.data[0];
          return {
            ...prev,
            facilityName: first.name,
            zoneName: first.zones[0] ?? ""
          };
        });
      } catch {
        setError("Failed to load facilities.");
      }
    };
    void loadFacilities();
  }, []);

  useEffect(() => {
    const status = searchParams.get("status") ?? "";
    const facilityName = searchParams.get("facilityName") ?? "";
    const updatedFrom = searchParams.get("updatedFrom") ?? "";
    const updatedToExclusive = searchParams.get("updatedTo") ?? "";
    setFilters({
      status,
      facilityName,
      updatedFrom,
      updatedTo: updatedToExclusive ? addDays(updatedToExclusive, -1) : ""
    });
  }, [searchParams]);

  const createWorkOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManage) return;
    setSaving(true);
    setError(null);
    try {
      await api.post("/work-orders", form);
      setForm((prev) => ({ ...prev, title: "", description: "" }));
      setIsCreateOpen(false);
      await load();
    } catch {
      setError("Failed to create work order.");
    } finally {
      setSaving(false);
    }
  };

  const archive = async (workOrderId: string) => {
    if (!canManage) return;
    setError(null);
    try {
      await api.post(`/work-orders/${workOrderId}/archive`);
      await load();
    } catch {
      setError("Archive failed. Work order must be Checked and Closed for at least 90 days.");
    }
  };

  const zonesForSelectedFacility =
    facilities.find((facility) => facility.name === form.facilityName)?.zones ?? [];
  const pageRaw = Number(searchParams.get("page") ?? "1");
  const currentPage = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;

  const setPage = (page: number) => {
    const next = new URLSearchParams(searchParams);
    if (page <= 1) next.delete("page");
    else next.set("page", String(page));
    setSearchParams(next);
  };

  const applyFilters = () => {
    const next = new URLSearchParams(searchParams);
    if (filters.facilityName) next.set("facilityName", filters.facilityName);
    else next.delete("facilityName");

    if (filters.status) {
      next.set("status", filters.status);
      next.delete("excludeStatus");
    } else {
      next.delete("status");
      next.delete("excludeStatus");
    }

    if (filters.updatedFrom) next.set("updatedFrom", filters.updatedFrom);
    else next.delete("updatedFrom");

    if (filters.updatedTo) next.set("updatedTo", addDays(filters.updatedTo, 1));
    else next.delete("updatedTo");

    next.delete("page");
    setSearchParams(next);
  };

  return (
    <AppShell title="Work Orders">
      <section className="rounded-2xl bg-fsm-panel shadow p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-semibold">All Work Orders</h2>
          <div className="flex items-center gap-3">
            {searchParams.toString() && (
              <Link to="/work-orders" className="text-sm underline">
                Clear Filters
              </Link>
            )}
            {canManage && (
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="rounded-lg bg-fsm-accent text-white px-4 py-2 text-sm font-semibold hover:bg-fsm-accentDark"
              >
                Create Work Order
              </button>
            )}
          </div>
        </div>
        <div className="mb-4 flex items-end gap-3">
          <label className="grid gap-1">
            <span className="text-sm text-slate-700">Facility</span>
            <select
              value={filters.facilityName}
              onChange={(e) => setFilters((prev) => ({ ...prev, facilityName: e.target.value }))}
              className="rounded border px-3 py-2"
            >
              <option value="">All Facilities</option>
              {facilities.map((facility) => (
                <option key={facility.id} value={facility.name}>
                  {facility.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-slate-700">Filter by Status</span>
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="rounded border px-3 py-2"
            >
              <option value="">All Statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {formatStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-slate-700">From</span>
            <input
              type="date"
              value={filters.updatedFrom}
              onChange={(e) => setFilters((prev) => ({ ...prev, updatedFrom: e.target.value }))}
              className="rounded border px-3 py-2"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-slate-700">To</span>
            <input
              type="date"
              value={filters.updatedTo}
              onChange={(e) => setFilters((prev) => ({ ...prev, updatedTo: e.target.value }))}
              className="rounded border px-3 py-2"
            />
          </label>
          <button
            type="button"
            onClick={applyFilters}
            className="rounded-lg bg-fsm-accent text-white px-4 py-2 text-sm font-semibold hover:bg-fsm-accentDark"
          >
            Apply Filters
          </button>
        </div>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        {loading ? (
          <p className="text-slate-600">Loading...</p>
        ) : workOrders.length === 0 ? (
          <p className="text-slate-600">No work orders found.</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">WO #</th>
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Facility</th>
                  <th className="py-2 pr-4">Zone</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Created</th>
                  {canManage && <th className="py-2 pr-4">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {workOrders.map((wo) => (
                  <tr key={wo.id} className="border-b last:border-0 align-top">
                    <td className="py-2 pr-4">{wo.wo_number}</td>
                    <td className="py-2 pr-4">
                      <Link className="font-medium underline" to={`/work-orders/${wo.id}`}>
                        {wo.title}
                      </Link>
                      <p className="text-slate-600">{wo.description}</p>
                    </td>
                    <td className="py-2 pr-4">{wo.facility_name}</td>
                    <td className="py-2 pr-4">{wo.zone_name ?? "-"}</td>
                    <td className="py-2 pr-4">{formatStatusLabel(wo.status)}</td>
                    <td className="py-2 pr-4">{new Date(wo.created_at).toLocaleString()}</td>
                    {canManage && (
                      <td className="py-2 pr-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="rounded border px-2 py-1 hover:bg-slate-50"
                            onClick={() => void archive(wo.id)}
                          >
                            Archive
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-600">Page {currentPage}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage <= 1 || loading}
              className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage(currentPage + 1)}
              disabled={!hasNextPage || loading}
              className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {canManage && (
        <div
          className={`fixed inset-0 z-50 transition-opacity duration-300 ${
            isCreateOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <button
            type="button"
            aria-label="Close create work order panel"
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setIsCreateOpen(false)}
          />
          <div
            className={`absolute right-0 top-0 h-full w-full max-w-2xl border-l border-fsm-border bg-white shadow-2xl transition-transform duration-300 ${
              isCreateOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between border-b border-fsm-border px-6 py-4">
              <h2 className="text-xl font-semibold">Create Work Order</h2>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded border px-3 py-1 text-sm hover:bg-slate-50"
              >
                Close
              </button>
            </div>
            <form className="grid gap-3 p-6" onSubmit={createWorkOrder}>
              <input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Title"
                className="rounded border px-3 py-2"
                required
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Description"
                className="rounded border px-3 py-2 min-h-24"
                required
              />
              <div className="grid md:grid-cols-2 gap-3">
                <label className="grid gap-1">
                  <span className="text-sm text-slate-700">Facility Name</span>
                  <select
                    className="rounded border px-3 py-2"
                    value={form.facilityName}
                    onChange={(e) => {
                      const facilityName = e.target.value;
                      const nextZones = facilities.find((facility) => facility.name === facilityName)?.zones ?? [];
                      setForm((prev) => ({
                        ...prev,
                        facilityName,
                        zoneName: nextZones[0] ?? ""
                      }));
                    }}
                    required
                  >
                    <option value="" disabled>
                      Select facility
                    </option>
                    {facilities.map((facility) => (
                      <option key={facility.id} value={facility.name}>
                        {facility.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-sm text-slate-700">Zone / Room</span>
                  <select
                    className="rounded border px-3 py-2"
                    value={form.zoneName}
                    onChange={(e) => setForm((prev) => ({ ...prev, zoneName: e.target.value }))}
                  >
                    <option value="">Select zone</option>
                    {zonesForSelectedFacility.map((zone) => (
                      <option key={zone} value={zone}>
                        {zone}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded border px-4 py-2 text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || facilities.length === 0}
                  className="rounded-lg bg-fsm-accent text-white px-4 py-2 text-sm font-semibold hover:bg-fsm-accentDark disabled:opacity-50"
                >
                  {saving ? "Creating..." : "Create Work Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
};
