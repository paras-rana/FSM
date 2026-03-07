import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { api } from "../modules/api/client";
import { useAuth } from "../modules/auth/AuthContext";
import { hasAnyRole } from "../modules/auth/roles";
import type { Facility, WorkOrder } from "../types";

const statuses = [
  "CREATED",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_FOR_PARTS",
  "COMPLETED",
  "REOPENED",
  "ARCHIVED"
] as const;

export const WorkOrdersPage = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [form, setForm] = useState({ title: "", description: "", facilityName: "", zoneName: "" });

  const canManage = useMemo(
    () => hasAnyRole(user?.roles, ["MANAGER", "ADMIN"]),
    [user?.roles]
  );

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "200" });
      const status = searchParams.get("status");
      const excludeStatus = searchParams.get("excludeStatus");
      const leadTechnicianId = searchParams.get("leadTechnicianId");
      const updatedFrom = searchParams.get("updatedFrom");
      const updatedTo = searchParams.get("updatedTo");
      const assignedOnly = searchParams.get("assignedOnly");
      if (status) params.set("status", status);
      if (excludeStatus) params.set("excludeStatus", excludeStatus);
      if (leadTechnicianId) params.set("leadTechnicianId", leadTechnicianId);
      if (updatedFrom) params.set("updatedFrom", updatedFrom);
      if (updatedTo) params.set("updatedTo", updatedTo);
      if (assignedOnly) params.set("assignedOnly", assignedOnly);
      const response = await api.get<WorkOrder[]>(`/work-orders?${params.toString()}`);
      setWorkOrders(response.data);
    } catch {
      setError("Failed to load work orders.");
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

  const createWorkOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManage) return;
    setSaving(true);
    setError(null);
    try {
      await api.post("/work-orders", form);
      setForm((prev) => ({ ...prev, title: "", description: "" }));
      await load();
    } catch {
      setError("Failed to create work order.");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (workOrderId: string, status: string) => {
    if (!canManage) return;
    setError(null);
    try {
      await api.post(`/work-orders/${workOrderId}/status`, { status });
      await load();
    } catch {
      setError("Status update failed.");
    }
  };

  const archive = async (workOrderId: string) => {
    if (!canManage) return;
    setError(null);
    try {
      await api.post(`/work-orders/${workOrderId}/archive`);
      await load();
    } catch {
      setError("Archive failed. Only completed work orders can be archived.");
    }
  };

  const zonesForSelectedFacility =
    facilities.find((facility) => facility.name === form.facilityName)?.zones ?? [];

  return (
    <AppShell title="Work Orders">
      {canManage && (
        <section className="rounded-2xl bg-fsm-panel shadow p-6">
          <h2 className="text-xl font-semibold">Create Work Order</h2>
          <form className="mt-4 grid gap-3" onSubmit={createWorkOrder}>
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
            <div>
              <button
                type="submit"
                disabled={saving || facilities.length === 0}
                className="rounded-lg bg-fsm-accent text-white px-4 py-2 font-semibold hover:bg-fsm-accentDark disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create Work Order"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-2xl bg-fsm-panel shadow p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-semibold">All Work Orders</h2>
          {searchParams.toString() && (
            <Link to="/work-orders" className="text-sm underline">
              Clear Filters
            </Link>
          )}
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
                    <td className="py-2 pr-4">{wo.status}</td>
                    <td className="py-2 pr-4">{new Date(wo.created_at).toLocaleString()}</td>
                    {canManage && (
                      <td className="py-2 pr-4">
                        <div className="flex flex-wrap gap-2">
                          <select
                            className="rounded border px-2 py-1"
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) {
                                void updateStatus(wo.id, e.target.value);
                                e.currentTarget.value = "";
                              }
                            }}
                          >
                            <option value="" disabled>
                              Set Status
                            </option>
                            {statuses.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
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
      </section>
    </AppShell>
  );
};
