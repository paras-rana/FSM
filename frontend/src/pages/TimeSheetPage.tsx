import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../components/AppShell";
import {
  CalendarIcon,
  PlusIcon,
  TimeSheetIcon,
  UserIcon,
  ViewIcon
} from "../components/Icons";
import { api } from "../modules/api/client";
import { useAuth } from "../modules/auth/AuthContext";
import { hasAnyRole } from "../modules/auth/roles";
import type { LaborEntry, WorkOrder } from "../types";

const categories = ["WORK_ORDER", "TRAINING", "MEETING", "ADMIN"] as const;
type Category = (typeof categories)[number];
type ViewMode = "day" | "week";
type TechnicianOption = {
  id: string;
  full_name: string;
  email: string;
};

const toYmd = (value: Date): string => value.toISOString().slice(0, 10);
const addDays = (value: Date, days: number): Date => {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
};
const startOfWeekMonday = (value: Date): Date => {
  const d = new Date(value);
  const day = d.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(d, offset);
};

export const TimeSheetPage = () => {
  const { user } = useAuth();
  const isManagerOrAdmin = useMemo(
    () => hasAnyRole(user?.roles, ["MANAGER", "ADMIN"]),
    [user?.roles]
  );
  const canCreate = useMemo(
    () => hasAnyRole(user?.roles, ["TECHNICIAN", "MANAGER", "ADMIN"]),
    [user?.roles]
  );

  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [selectedDate, setSelectedDate] = useState(toYmd(new Date()));
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [selectedTechId, setSelectedTechId] = useState("");
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [entries, setEntries] = useState<LaborEntry[]>([]);
  const [workOrderByCategory, setWorkOrderByCategory] = useState<Record<Category, string>>({
    WORK_ORDER: "",
    TRAINING: "",
    MEETING: "",
    ADMIN: ""
  });
  const [entryDateByCategory, setEntryDateByCategory] = useState<Record<Category, string>>({
    WORK_ORDER: toYmd(new Date()),
    TRAINING: toYmd(new Date()),
    MEETING: toYmd(new Date()),
    ADMIN: toYmd(new Date())
  });
  const [hoursByCategory, setHoursByCategory] = useState<Record<Category, string>>({
    WORK_ORDER: "0",
    TRAINING: "0",
    MEETING: "0",
    ADMIN: "0"
  });
  const [loading, setLoading] = useState(true);
  const [savingCategory, setSavingCategory] = useState<Category | null>(null);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => {
    if (viewMode === "day") {
      return { from: selectedDate, to: selectedDate };
    }
    const start = startOfWeekMonday(new Date(`${selectedDate}T00:00:00`));
    const end = addDays(start, 6);
    return { from: toYmd(start), to: toYmd(end) };
  }, [selectedDate, viewMode]);

  const weekDays = useMemo(() => {
    if (viewMode !== "week") return [];
    const start = new Date(`${range.from}T00:00:00`);
    return Array.from({ length: 7 }, (_, index) => toYmd(addDays(start, index)));
  }, [range.from, viewMode]);

  const loadEntries = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        from: range.from,
        to: range.to,
        limit: "1000"
      });
      if (isManagerOrAdmin && selectedTechId) {
        params.set("technicianId", selectedTechId);
      }
      const response = await api.get<LaborEntry[]>(`/labor-entries?${params.toString()}`);
      setEntries(response.data);
    } catch {
      setError("Failed to load timesheet entries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadTechnicians = async () => {
      if (!isManagerOrAdmin) return;
      try {
        const response = await api.get<TechnicianOption[]>("/labor-entries/technicians");
        setTechnicians(response.data);
        if (!selectedTechId && response.data.length > 0) {
          setSelectedTechId(response.data[0].id);
        }
      } catch {
        setError("Failed to load technicians.");
      }
    };
    void loadTechnicians();
  }, [isManagerOrAdmin]);

  useEffect(() => {
    const loadWorkOrders = async () => {
      if (!canCreate) return;
      try {
        const response = await api.get<WorkOrder[]>("/work-orders?limit=200");
        setWorkOrders(response.data);
        setWorkOrderByCategory((prev) => ({
          ...prev,
          WORK_ORDER: prev.WORK_ORDER || response.data[0]?.id || ""
        }));
      } catch {
        setError("Failed to load work orders.");
      }
    };
    void loadWorkOrders();
  }, [canCreate]);

  useEffect(() => {
    if (isManagerOrAdmin && !selectedTechId) return;
    void loadEntries();
  }, [range.from, range.to, selectedTechId, isManagerOrAdmin]);

  const totalsByCategory = useMemo(() => {
    return categories.reduce(
      (acc, category) => {
        acc[category] = entries
          .filter((entry) => entry.entry_type === category)
          .reduce((sum, entry) => sum + Number(entry.hours || 0), 0);
        return acc;
      },
      { WORK_ORDER: 0, TRAINING: 0, MEETING: 0, ADMIN: 0 } as Record<Category, number>
    );
  }, [entries]);

  const weekGrid = useMemo(() => {
    const map: Record<string, Record<Category, number>> = {};
    for (const day of weekDays) {
      map[day] = { WORK_ORDER: 0, TRAINING: 0, MEETING: 0, ADMIN: 0 };
    }
    for (const entry of entries) {
      if (!map[entry.entry_date]) continue;
      map[entry.entry_date][entry.entry_type] += Number(entry.hours || 0);
    }
    return map;
  }, [entries, weekDays]);

  const addCategoryHours = async (category: Category) => {
    if (!canCreate) return;
    if (isManagerOrAdmin && !selectedTechId) return;
    if (category === "WORK_ORDER" && !workOrderByCategory.WORK_ORDER) {
      setError("Work Order is required for WORK ORDER labor.");
      return;
    }
    const hours = Number(hoursByCategory[category]);
    if (hours <= 0) {
      setError("Hours must be greater than 0.");
      return;
    }

    setSavingCategory(category);
    setError(null);
    try {
      await api.post("/labor-entries", {
        workOrderId: category === "WORK_ORDER" ? workOrderByCategory.WORK_ORDER : null,
        technicianId: isManagerOrAdmin ? selectedTechId : undefined,
        hours,
        entryType: category,
        entryDate: entryDateByCategory[category]
      });
      setHoursByCategory((prev) => ({ ...prev, [category]: "0" }));
      await loadEntries();
    } catch {
      setError("Could not save labor hours.");
    } finally {
      setSavingCategory(null);
    }
  };

  return (
    <AppShell title="TimeSheet">
      <section className="rounded-2xl bg-fsm-panel shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {isManagerOrAdmin && (
            <label className="grid gap-1 md:col-span-4">
              <span className="text-sm text-slate-700 inline-flex items-center gap-1">
                <UserIcon size={14} />
                Technician
              </span>
              <select
                className="rounded border px-3 py-2"
                value={selectedTechId}
                onChange={(e) => setSelectedTechId(e.target.value)}
              >
                {technicians.map((technician) => (
                  <option key={technician.id} value={technician.id}>
                    {technician.full_name} ({technician.email})
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className={`grid gap-1 ${isManagerOrAdmin ? "md:col-span-3" : "md:col-span-4"}`}>
            <span className="text-sm text-slate-700 inline-flex items-center gap-1">
              <ViewIcon size={14} />
              View
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`rounded px-3 py-2 text-sm ${viewMode === "day" ? "bg-fsm-accent text-white" : "bg-fsm-blue-soft border border-fsm-blue-soft-hover text-fsm-ink"}`}
                onClick={() => setViewMode("day")}
              >
                Day
              </button>
              <button
                type="button"
                className={`rounded px-3 py-2 text-sm ${viewMode === "week" ? "bg-fsm-accent text-white" : "bg-fsm-blue-soft border border-fsm-blue-soft-hover text-fsm-ink"}`}
                onClick={() => setViewMode("week")}
              >
                Week
              </button>
            </div>
          </label>
          <label className={`grid gap-1 ${isManagerOrAdmin ? "md:col-span-2" : "md:col-span-3"}`}>
            <span className="text-sm text-slate-700 inline-flex items-center gap-1">
              <CalendarIcon size={14} />
              {viewMode === "day" ? "Day" : "Week Of"}
            </span>
            <input
              type="date"
              className="rounded border px-3 py-2"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </label>
          <div className={`grid gap-1 ${isManagerOrAdmin ? "md:col-span-3" : "md:col-span-5"}`}>
            <span className="text-sm text-slate-700">Range</span>
            <p className="rounded border px-3 py-2 bg-white text-sm">
              {range.from} to {range.to}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-fsm-panel shadow p-6">
        <h2 className="text-xl font-semibold mb-3 inline-flex items-center gap-2">
          <TimeSheetIcon size={18} />
          {viewMode === "day" ? "Day Review" : "Week Review"}
        </h2>
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        {loading ? (
          <p className="text-slate-600">Loading...</p>
        ) : viewMode === "day" ? (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Hours</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category} className="border-b last:border-0">
                    <td className="py-2 pr-3">{category.replace("_", " ")}</td>
                    <td className="py-2 pr-3">{totalsByCategory[category].toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-2 pr-3">Total</td>
                  <td className="py-2 pr-3">
                    {categories
                      .reduce((sum, category) => sum + totalsByCategory[category], 0)
                      .toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Category</th>
                  {weekDays.map((day) => (
                    <th key={day} className="py-2 pr-3">
                      {day}
                    </th>
                  ))}
                  <th className="py-2 pr-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category} className="border-b last:border-0">
                    <td className="py-2 pr-3">{category.replace("_", " ")}</td>
                    {weekDays.map((day) => (
                      <td key={`${category}-${day}`} className="py-2 pr-3">
                        {(weekGrid[day]?.[category] ?? 0).toFixed(2)}
                      </td>
                    ))}
                    <td className="py-2 pr-3 font-semibold">
                      {weekDays
                        .reduce((sum, day) => sum + (weekGrid[day]?.[category] ?? 0), 0)
                        .toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {canCreate && (
        <section className="rounded-2xl bg-fsm-panel shadow p-6">
          <h2 className="text-xl font-semibold mb-4 inline-flex items-center gap-2">
            <PlusIcon size={18} />
            Add Labor Hours
          </h2>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Work Order #</th>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Hours</th>
                  <th className="py-2 pr-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category} className="border-b last:border-0">
                    <td className="py-2 pr-3 whitespace-nowrap">{category.replace("_", " ")}</td>
                    <td className="py-2 pr-3">
                      {category === "WORK_ORDER" ? (
                        <select
                          className="rounded border px-2 py-1 min-w-64"
                          value={workOrderByCategory.WORK_ORDER}
                          onChange={(e) =>
                            setWorkOrderByCategory((prev) => ({ ...prev, WORK_ORDER: e.target.value }))
                          }
                          required
                        >
                          <option value="" disabled>
                            Select work order
                          </option>
                          {workOrders.map((workOrder) => (
                            <option key={workOrder.id} value={workOrder.id}>
                              WO-{workOrder.wo_number} | {workOrder.title}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-slate-500">N/A</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="date"
                        className="rounded border px-2 py-1"
                        value={entryDateByCategory[category]}
                        onChange={(e) =>
                          setEntryDateByCategory((prev) => ({ ...prev, [category]: e.target.value }))
                        }
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        className="rounded border px-2 py-1 w-24"
                        value={hoursByCategory[category]}
                        onChange={(e) =>
                          setHoursByCategory((prev) => ({ ...prev, [category]: e.target.value }))
                        }
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <button
                        type="button"
                        disabled={savingCategory === category}
                        onClick={() => void addCategoryHours(category)}
                        className="rounded bg-fsm-accent text-white px-3 py-1.5 text-sm hover:bg-fsm-accentDark disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        <PlusIcon size={14} />
                        {savingCategory === category ? "Saving..." : "Add Labor"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </AppShell>
  );
};
