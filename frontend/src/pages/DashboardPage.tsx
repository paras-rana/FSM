import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../modules/api/client";
import type { DashboardSummary } from "../types";
import { AppShell } from "../components/AppShell";

const formatWeekRange = (weekStartRaw: string): string => {
  const start = new Date(weekStartRaw);
  if (Number.isNaN(start.getTime())) return weekStartRaw;
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`;
};

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get<DashboardSummary>("/reports/dashboard");
        setSummary(response.data);
      } catch {
        setSummary(null);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const totalOpenWorkOrders =
    summary?.workOrdersByStatus
      .filter((row) => !["COMPLETED", "ARCHIVED"].includes(row.status))
      .reduce((sum, row) => sum + Number(row.count || 0), 0) ?? 0;
  const totalNewServiceRequests = summary?.newServiceRequests.count ?? 0;
  const closedThisWeek =
    summary?.closedByWeek.length
      ? Number(summary.closedByWeek[summary.closedByWeek.length - 1]?.closed_count || 0)
      : 0;
  const activeTechnicians =
    summary?.openAssignedByTechnician.filter((row) => Number(row.open_count || 0) > 0).length ?? 0;
  const thisWeekStart = summary?.closedByWeek[summary.closedByWeek.length - 1]?.week_start ?? null;
  const thisWeekEndExclusive = (() => {
    if (!thisWeekStart) return null;
    const d = new Date(thisWeekStart);
    if (Number.isNaN(d.getTime())) return null;
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  })();

  return (
    <AppShell title="FSM Dashboard">
      <section className="rounded-2xl bg-fsm-panel shadow p-6">
        <h2 className="text-xl font-semibold mb-4">KPI Snapshot</h2>
        <div className="grid md:grid-cols-4 gap-4">
          <button
            type="button"
            className="rounded-xl border p-4 bg-white/60 text-left hover:bg-white/80"
            onClick={() => navigate("/work-orders?excludeStatus=COMPLETED,ARCHIVED")}
          >
            <p className="text-sm text-slate-600">Total Open Work Orders</p>
            <p className="text-2xl font-bold mt-1">{loading ? "-" : totalOpenWorkOrders}</p>
          </button>
          <button
            type="button"
            className="rounded-xl border p-4 bg-white/60 text-left hover:bg-white/80"
            onClick={() => navigate("/service-requests?status=SUBMITTED")}
          >
            <p className="text-sm text-slate-600">Total New Service Requests</p>
            <p className="text-2xl font-bold mt-1">{loading ? "-" : totalNewServiceRequests}</p>
          </button>
          <button
            type="button"
            className="rounded-xl border p-4 bg-white/60 text-left hover:bg-white/80 disabled:opacity-60"
            disabled={!thisWeekStart || !thisWeekEndExclusive}
            onClick={() => {
              if (!thisWeekStart || !thisWeekEndExclusive) return;
              navigate(
                `/work-orders?status=COMPLETED,ARCHIVED&updatedFrom=${thisWeekStart}&updatedTo=${thisWeekEndExclusive}`
              );
            }}
          >
            <p className="text-sm text-slate-600">Closed This Week</p>
            <p className="text-2xl font-bold mt-1">{loading ? "-" : closedThisWeek}</p>
          </button>
          <button
            type="button"
            className="rounded-xl border p-4 bg-white/60 text-left hover:bg-white/80"
            onClick={() =>
              navigate("/work-orders?excludeStatus=COMPLETED,ARCHIVED&assignedOnly=true")
            }
          >
            <p className="text-sm text-slate-600">Active Technicians</p>
            <p className="text-2xl font-bold mt-1">{loading ? "-" : activeTechnicians}</p>
          </button>
        </div>
      </section>

      <section className="rounded-2xl bg-fsm-panel shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Work Orders By Status</h2>
        {loading ? (
          <p className="text-slate-600">Loading...</p>
        ) : !summary || summary.workOrdersByStatus.length === 0 ? (
          <p className="text-slate-600">No work order status data available.</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Count</th>
                </tr>
              </thead>
              <tbody>
                {summary.workOrdersByStatus.map((row) => (
                  <tr
                    key={row.status}
                    className="border-b last:border-0 cursor-pointer hover:bg-white/40"
                    onClick={() => navigate(`/work-orders?status=${row.status}`)}
                  >
                    <td className="py-2 pr-4">{row.status}</td>
                    <td className="py-2 pr-4">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-fsm-panel shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">New Service Requests</h2>
          {!loading && summary && (
            <p className="text-sm rounded bg-white px-3 py-1 border">
              Total New: <strong>{summary.newServiceRequests.count}</strong>
            </p>
          )}
        </div>
        {loading ? (
          <p className="text-slate-600">Loading...</p>
        ) : !summary || summary.newServiceRequests.items.length === 0 ? (
          <p className="text-slate-600">No new service requests.</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">SR #</th>
                  <th className="py-2 pr-4">Requestor</th>
                  <th className="py-2 pr-4">Building</th>
                  <th className="py-2 pr-4">Area</th>
                  <th className="py-2 pr-4">Urgency</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Created</th>
                </tr>
              </thead>
              <tbody>
                {summary.newServiceRequests.items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b last:border-0 cursor-pointer hover:bg-white/40"
                    onClick={() => navigate(`/service-requests/${item.id}`)}
                  >
                    <td className="py-2 pr-4">{item.sr_number}</td>
                    <td className="py-2 pr-4">{item.requestor_name}</td>
                    <td className="py-2 pr-4">{item.building ?? "-"}</td>
                    <td className="py-2 pr-4">{item.area ?? "-"}</td>
                    <td className="py-2 pr-4">{item.urgency ?? "-"}</td>
                    <td className="py-2 pr-4">{item.status}</td>
                    <td className="py-2 pr-4">{new Date(item.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-fsm-panel shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Work Orders Closed By Week (Last 4 Weeks)</h2>
        {loading ? (
          <p className="text-slate-600">Loading...</p>
        ) : !summary || summary.closedByWeek.length === 0 ? (
          <p className="text-slate-600">No closure data available.</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Week</th>
                  <th className="py-2 pr-4">Closed Count</th>
                </tr>
              </thead>
              <tbody>
                {summary.closedByWeek.map((row) => (
                  <tr
                    key={row.week_start}
                    className="border-b last:border-0 cursor-pointer hover:bg-white/40"
                    onClick={() => {
                      const start = new Date(row.week_start);
                      if (Number.isNaN(start.getTime())) return;
                      const endExclusive = new Date(start);
                      endExclusive.setDate(start.getDate() + 7);
                      navigate(
                        `/work-orders?status=COMPLETED,ARCHIVED&updatedFrom=${start
                          .toISOString()
                          .slice(0, 10)}&updatedTo=${endExclusive.toISOString().slice(0, 10)}`
                      );
                    }}
                  >
                    <td className="py-2 pr-4">{formatWeekRange(row.week_start)}</td>
                    <td className="py-2 pr-4">{row.closed_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-fsm-panel shadow p-6">
        <h2 className="text-xl font-semibold mb-4">
          Open Work Orders Assigned By Technician (Excluding Closed)
        </h2>
        {loading ? (
          <p className="text-slate-600">Loading...</p>
        ) : !summary || summary.openAssignedByTechnician.length === 0 ? (
          <p className="text-slate-600">No assigned open work orders found.</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Technician</th>
                  <th className="py-2 pr-4">Open Assigned Count</th>
                </tr>
              </thead>
              <tbody>
                {summary.openAssignedByTechnician.map((row) => (
                  <tr
                    key={row.technician_id}
                    className="border-b last:border-0 cursor-pointer hover:bg-white/40"
                    onClick={() =>
                      navigate(
                        `/work-orders?excludeStatus=COMPLETED,ARCHIVED&leadTechnicianId=${row.technician_id}`
                      )
                    }
                  >
                    <td className="py-2 pr-4">{row.full_name}</td>
                    <td className="py-2 pr-4">{row.open_count}</td>
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
