import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../modules/api/client";
import type { DashboardSummary } from "../types";
import { AppShell } from "../components/AppShell";
import { formatStatusLabel } from "../modules/status/format";

const formatWeekRange = (weekStartRaw: string): string => {
  const start = new Date(weekStartRaw);
  if (Number.isNaN(start.getTime())) return weekStartRaw;
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);

  const startMonth = start.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const endMonth = end.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const startDay = start.getUTCDate();
  const endDay = end.getUTCDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}`;
  }
  return `${startMonth} ${startDay}-${endMonth} ${endDay}`;
};

const formatDurationOpen = (hoursRaw: number): string => {
  const hours = Number(hoursRaw || 0);
  const roundedDays = Math.max(1, Math.round(hours / 24));
  return `${roundedDays} day${roundedDays === 1 ? "" : "s"}`;
};

const formatMonthKey = (value: Date): string =>
  `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
const formatMonthLabel = (value: Date): string =>
  value.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    Number(amount || 0)
  );

type CostKpiResponse = {
  items: Array<{
    month: string;
    total: number;
  }>;
};
type LaborKpiResponse = {
  items: Array<{
    month: string;
    totalHours: number;
  }>;
};
type MonthlyKpis = {
  thisMonthCost: number | null;
  lastMonthCost: number | null;
  thisMonthLabor: number | null;
  lastMonthLabor: number | null;
};

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [monthlyKpis, setMonthlyKpis] = useState<MonthlyKpis>({
    thisMonthCost: null,
    lastMonthCost: null,
    thisMonthLabor: null,
    lastMonthLabor: null
  });
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const thisMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const lastMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const thisMonthKey = formatMonthKey(thisMonthDate);
  const lastMonthKey = formatMonthKey(lastMonthDate);

  useEffect(() => {
    const load = async () => {
      try {
        const [dashboardResult, costResult, laborResult] =
          await Promise.allSettled([
            api.get<DashboardSummary>("/reports/dashboard"),
            api.get<CostKpiResponse>(`/reports/kpis/cost-totals?months=${thisMonthKey},${lastMonthKey}`),
            api.get<LaborKpiResponse>(`/reports/kpis/labor-totals?months=${thisMonthKey},${lastMonthKey}`)
          ]);

        const costByMonth = new Map<string, number>();
        if (costResult.status === "fulfilled") {
          for (const row of costResult.value.data.items ?? []) {
            costByMonth.set(row.month, Number(row.total || 0));
          }
        }

        const laborByMonth = new Map<string, number>();
        if (laborResult.status === "fulfilled") {
          for (const row of laborResult.value.data.items ?? []) {
            laborByMonth.set(row.month, Number(row.totalHours || 0));
          }
        }

        setSummary(dashboardResult.status === "fulfilled" ? dashboardResult.value.data : null);
        setMonthlyKpis({
          thisMonthCost: costByMonth.has(thisMonthKey) ? costByMonth.get(thisMonthKey)! : null,
          lastMonthCost: costByMonth.has(lastMonthKey) ? costByMonth.get(lastMonthKey)! : null,
          thisMonthLabor: laborByMonth.has(thisMonthKey) ? laborByMonth.get(thisMonthKey)! : null,
          lastMonthLabor: laborByMonth.has(lastMonthKey) ? laborByMonth.get(lastMonthKey)! : null
        });
      } catch {
        setSummary(null);
        setMonthlyKpis({
          thisMonthCost: null,
          lastMonthCost: null,
          thisMonthLabor: null,
          lastMonthLabor: null
        });
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const totalOpenWorkOrders =
    summary?.workOrdersByStatus
      .filter((row) => !["CHECKED_AND_CLOSED", "ARCHIVED"].includes(row.status))
      .reduce((sum, row) => sum + Number(row.count || 0), 0) ?? 0;
  const totalNewServiceRequests = summary?.newServiceRequests.count ?? 0;
  const avgTimeToCloseDays = summary?.avgTimeToCloseDays ?? 0;
  const activeTechnicians =
    summary?.openAssignedByTechnician.filter((row) => Number(row.open_count || 0) > 0).length ?? 0;
  const statusRowsTop = [...(summary?.workOrdersByStatus ?? [])]
    .sort((a, b) => Number(b.count || 0) - Number(a.count || 0))
    .slice(0, 3);
  const closedByWeekTop = [...(summary?.closedByWeek ?? [])].slice(-3).reverse();

  return (
    <AppShell title="FSM Dashboard">
      <section className="rounded-2xl bg-fsm-panel shadow p-6">
        <h2 className="text-xl font-semibold mb-4">KPI Snapshot</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <button
            type="button"
            className="rounded-xl border p-4 bg-white/60 text-left hover:bg-white/80 border-t-4 border-t-sky-500"
            onClick={() => navigate("/work-orders?excludeStatus=CHECKED_AND_CLOSED,ARCHIVED")}
          >
            <p className="text-sm text-slate-600">Total Open Work Orders</p>
            <p className="text-2xl font-bold mt-1">{loading ? "-" : totalOpenWorkOrders}</p>
          </button>
          <button
            type="button"
            className="rounded-xl border p-4 bg-white/60 text-left hover:bg-white/80 border-t-4 border-t-sky-500"
            onClick={() => navigate("/work-orders?status=CHECKED_AND_CLOSED,ARCHIVED")}
          >
            <p className="text-sm text-slate-600">Average Time to Close (Days)</p>
            <p className="text-2xl font-bold mt-1">{loading ? "-" : avgTimeToCloseDays.toFixed(1)}</p>
          </button>
          <button
            type="button"
            className="rounded-xl border p-4 bg-white/60 text-left hover:bg-white/80 border-t-4 border-t-amber-500"
            onClick={() => navigate("/reports")}
          >
            <p className="text-sm text-slate-600">Total Cost (Material + Vendor)</p>
            <p className="mt-2 text-xs text-slate-500">This Month ({formatMonthLabel(thisMonthDate)})</p>
            <p className="text-xl font-bold mt-0.5">
              {loading
                ? "-"
                : monthlyKpis.thisMonthCost === null
                  ? "N/A"
                  : formatCurrency(monthlyKpis.thisMonthCost)}
            </p>
            <p className="mt-2 text-xs text-slate-500">Last Month ({formatMonthLabel(lastMonthDate)})</p>
            <p className="text-lg font-semibold mt-0.5">
              {loading
                ? "-"
                : monthlyKpis.lastMonthCost === null
                  ? "N/A"
                  : formatCurrency(monthlyKpis.lastMonthCost)}
            </p>
          </button>
          <button
            type="button"
            className="rounded-xl border p-4 bg-white/60 text-left hover:bg-white/80 border-t-4 border-t-violet-500"
            onClick={() => navigate("/reports")}
          >
            <p className="text-sm text-slate-600">Total Labor</p>
            <p className="mt-2 text-xs text-slate-500">This Month ({formatMonthLabel(thisMonthDate)})</p>
            <p className="text-xl font-bold mt-0.5">
              {loading
                ? "-"
                : monthlyKpis.thisMonthLabor === null
                  ? "N/A"
                  : `${monthlyKpis.thisMonthLabor.toFixed(1)} hrs`}
            </p>
            <p className="mt-2 text-xs text-slate-500">Last Month ({formatMonthLabel(lastMonthDate)})</p>
            <p className="text-lg font-semibold mt-0.5">
              {loading
                ? "-"
                : monthlyKpis.lastMonthLabor === null
                  ? "N/A"
                  : `${monthlyKpis.lastMonthLabor.toFixed(1)} hrs`}
            </p>
          </button>
          <button
            type="button"
            className="rounded-xl border p-4 bg-white/60 text-left hover:bg-white/80 border-t-4 border-t-rose-500"
            onClick={() =>
              navigate("/work-orders?excludeStatus=CHECKED_AND_CLOSED,ARCHIVED&assignedOnly=true")
            }
          >
            <p className="text-sm text-slate-600">Active Technicians</p>
            <p className="text-2xl font-bold mt-1">{loading ? "-" : activeTechnicians}</p>
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-fsm-panel shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Work Orders By Status</h2>
          {loading ? (
            <p className="text-slate-600">Loading...</p>
          ) : !summary || statusRowsTop.length === 0 ? (
            <p className="text-slate-600">No work order status data available.</p>
          ) : (
            <div className="space-y-2">
              {statusRowsTop.map((row) => (
                <button
                  key={row.status}
                  type="button"
                  className="w-full text-left rounded border bg-white/60 px-3 py-2 hover:bg-white/80"
                  onClick={() => navigate(`/work-orders?status=${row.status}`)}
                >
                  <span className="text-sm text-slate-600">{formatStatusLabel(row.status)}</span>
                  <span className="float-right font-semibold">{row.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-fsm-panel shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Work Orders Closed By Week</h2>
          {loading ? (
            <p className="text-slate-600">Loading...</p>
          ) : !summary || closedByWeekTop.length === 0 ? (
            <p className="text-slate-600">No closure data available.</p>
          ) : (
            <div className="space-y-2">
              {closedByWeekTop.map((row) => (
                <button
                  key={row.week_start}
                  type="button"
                  className="w-full text-left rounded border bg-white/60 px-3 py-2 hover:bg-white/80"
                  onClick={() => {
                    const start = new Date(row.week_start);
                    if (Number.isNaN(start.getTime())) return;
                    const endExclusive = new Date(start);
                    endExclusive.setDate(start.getDate() + 7);
                    navigate(
                      `/work-orders?status=CHECKED_AND_CLOSED,ARCHIVED&updatedFrom=${start
                        .toISOString()
                        .slice(0, 10)}&updatedTo=${endExclusive.toISOString().slice(0, 10)}`
                    );
                  }}
                >
                  <span className="text-sm text-slate-600">{formatWeekRange(row.week_start)}</span>
                  <span className="float-right font-semibold">{row.closed_count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-fsm-panel shadow p-6">
          <h2 className="text-xl font-semibold mb-2">New Service Requests</h2>
          <p className="text-sm text-slate-600 mb-4">Current submitted requests</p>
          <p className="text-4xl font-bold mb-4">{loading ? "-" : totalNewServiceRequests}</p>
          <button
            type="button"
            className="text-sm font-medium text-fsm-primary hover:underline"
            onClick={() => navigate("/service-requests?status=SUBMITTED")}
          >
            View Service Requests
          </button>
        </div>
      </section>

      <section className="rounded-2xl bg-fsm-panel shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Open Work Orders</h2>
        {loading ? (
          <p className="text-slate-600">Loading...</p>
        ) : !summary || summary.longestOpenWorkOrders.length === 0 ? (
          <p className="text-slate-600">No open work orders found.</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">WO #</th>
                  <th className="py-2 pr-4">Tech Assigned</th>
                  <th className="py-2 pr-4">Duration Open</th>
                </tr>
              </thead>
              <tbody>
                {summary.longestOpenWorkOrders.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b last:border-0 cursor-pointer hover:bg-white/40"
                    onClick={() => navigate(`/work-orders/${row.id}`)}
                  >
                    <td className="py-2 pr-4">{row.wo_number}</td>
                    <td className="py-2 pr-4">{row.technician_name ?? "Unassigned"}</td>
                    <td className="py-2 pr-4">{formatDurationOpen(Number(row.duration_open_hours || 0))}</td>
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
