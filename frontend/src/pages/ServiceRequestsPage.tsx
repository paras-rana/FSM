import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { api } from "../modules/api/client";
import { useAuth } from "../modules/auth/AuthContext";
import { hasAnyRole } from "../modules/auth/roles";
import { formatStatusLabel } from "../modules/status/format";
import type { ServiceRequest } from "../types";

export const ServiceRequestsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canConvert = useMemo(
    () => hasAnyRole(user?.roles, ["MANAGER", "ADMIN"]),
    [user?.roles]
  );

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "100" });
      const status = searchParams.get("status");
      if (status) params.set("status", status);
      const response = await api.get<ServiceRequest[]>(`/service-requests?${params.toString()}`);
      setItems(response.data);
    } catch {
      setError("Failed to load service requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [searchParams]);

  const convert = async (id: string) => {
    if (!canConvert) return;
    setError(null);
    try {
      const response = await api.post<{ id: string }>(`/service-requests/${id}/convert-to-wo`);
      navigate(`/work-orders/${response.data.id}`);
    } catch {
      setError("Conversion failed. Request may already be converted.");
    }
  };

  return (
    <AppShell title="Service Requests">
      <section className="rounded-2xl bg-fsm-panel shadow p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-semibold">Internal Service Requests</h2>
          {searchParams.toString() && (
            <Link to="/service-requests" className="text-sm underline">
              Clear Filters
            </Link>
          )}
        </div>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        {loading ? (
          <p className="text-slate-600">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-slate-600">No service requests found.</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">SR #</th>
                  <th className="py-2 pr-4">Requestor</th>
                  <th className="py-2 pr-4">Facility</th>
                  <th className="py-2 pr-4">Zone</th>
                  <th className="py-2 pr-4">Urgency</th>
                  <th className="py-2 pr-4">Contact</th>
                  <th className="py-2 pr-4">Description</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Created</th>
                  {canConvert && <th className="py-2 pr-4">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((sr) => (
                  <tr key={sr.id} className="border-b last:border-0 align-top">
                    <td className="py-2 pr-4">
                      <Link className="underline font-medium" to={`/service-requests/${sr.id}`}>
                        {sr.sr_number}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">{sr.requestor_name}</td>
                    <td className="py-2 pr-4">{sr.building}</td>
                    <td className="py-2 pr-4">{sr.area}</td>
                    <td className="py-2 pr-4">{sr.urgency}</td>
                    <td className="py-2 pr-4">{sr.contact_info}</td>
                    <td className="py-2 pr-4">{sr.description}</td>
                    <td className="py-2 pr-4">{formatStatusLabel(sr.status)}</td>
                    <td className="py-2 pr-4">{new Date(sr.created_at).toLocaleString()}</td>
                    {canConvert && (
                      <td className="py-2 pr-4">
                        <button
                          className="rounded border px-2 py-1 hover:bg-slate-50 disabled:opacity-50"
                          onClick={() => void convert(sr.id)}
                          disabled={sr.status === "CONVERTED"}
                        >
                          Convert to WO
                        </button>
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
