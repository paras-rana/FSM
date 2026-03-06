import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../components/AppShell";
import { api } from "../modules/api/client";
import { useAuth } from "../modules/auth/AuthContext";
import { hasAnyRole } from "../modules/auth/roles";
import type { LaborEntry, TimesheetRow } from "../types";

const entryTypes = ["WORK_ORDER", "TRAINING", "MEETING", "ADMIN"] as const;

const today = new Date().toISOString().slice(0, 10);

export const LaborTimesheetPage = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LaborEntry[]>([]);
  const [summary, setSummary] = useState<TimesheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    workOrderId: "",
    hours: "1",
    entryType: "WORK_ORDER",
    entryDate: today
  });

  const canCreate = useMemo(
    () => hasAnyRole(user?.roles, ["TECHNICIAN", "MANAGER", "ADMIN"]),
    [user?.roles]
  );

  const isManagerOrAdmin = useMemo(
    () => hasAnyRole(user?.roles, ["MANAGER", "ADMIN"]),
    [user?.roles]
  );

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [entriesRes, summaryRes] = await Promise.all([
        api.get<LaborEntry[]>("/labor-entries?limit=100"),
        api.get<TimesheetRow[]>(`/reports/timesheets?from=${today}&to=${today}`)
      ]);
      setEntries(entriesRes.data);
      setSummary(summaryRes.data);
    } catch {
      setError("Failed to load labor/timesheet data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canCreate) return;
    setSaving(true);
    setError(null);
    try {
      await api.post("/labor-entries", {
        workOrderId: form.workOrderId || null,
        hours: Number(form.hours),
        entryType: form.entryType,
        entryDate: form.entryDate
      });
      await load();
    } catch {
      setError("Could not create labor entry. Check date/hours constraints.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Labor & Timesheets">
      {canCreate && (
        <section className="rounded-2xl bg-fsm-panel shadow p-6">
          <h2 className="text-xl font-semibold">Log Labor Entry</h2>
          <form className="mt-4 grid md:grid-cols-4 gap-3" onSubmit={submit}>
            <input
              placeholder="Work Order ID (optional)"
              className="rounded border px-3 py-2"
              value={form.workOrderId}
              onChange={(e) => setForm((p) => ({ ...p, workOrderId: e.target.value }))}
            />
            <input
              type="number"
              min="0.1"
              step="0.1"
              className="rounded border px-3 py-2"
              value={form.hours}
              onChange={(e) => setForm((p) => ({ ...p, hours: e.target.value }))}
              required
            />
            <select
              className="rounded border px-3 py-2"
              value={form.entryType}
              onChange={(e) => setForm((p) => ({ ...p, entryType: e.target.value }))}
            >
              {entryTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="rounded border px-3 py-2"
              value={form.entryDate}
              onChange={(e) => setForm((p) => ({ ...p, entryDate: e.target.value }))}
              required
            />
            <div className="md:col-span-4">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-fsm-accent text-white px-4 py-2 font-semibold hover:bg-fsm-accentDark disabled:opacity-50"
              >
                {saving ? "Saving..." : "Add Entry"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-2xl bg-fsm-panel shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Today Timesheet Summary</h2>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        {loading ? (
          <p className="text-slate-600">Loading...</p>
        ) : summary.length === 0 ? (
          <p className="text-slate-600">No labor summary for today.</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Technician</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Total Hours</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row) => (
                  <tr key={`${row.technician_id}-${row.entry_date}`} className="border-b last:border-0">
                    <td className="py-2 pr-4">{row.full_name}</td>
                    <td className="py-2 pr-4">{row.entry_date}</td>
                    <td className="py-2 pr-4">{Number(row.total_hours).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-fsm-panel shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Labor Entries</h2>
        {loading ? (
          <p className="text-slate-600">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="text-slate-600">No labor entries found.</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Hours</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Work Order</th>
                  {isManagerOrAdmin && <th className="py-2 pr-4">Technician ID</th>}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{entry.entry_date}</td>
                    <td className="py-2 pr-4">{Number(entry.hours).toFixed(2)}</td>
                    <td className="py-2 pr-4">{entry.entry_type}</td>
                    <td className="py-2 pr-4">{entry.work_order_id ?? "-"}</td>
                    {isManagerOrAdmin && <td className="py-2 pr-4">{entry.technician_id}</td>}
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

