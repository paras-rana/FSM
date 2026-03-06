import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { AppShell } from "../components/AppShell";
import { api } from "../modules/api/client";
import { useAuth } from "../modules/auth/AuthContext";
import { hasAnyRole } from "../modules/auth/roles";
import type { ServiceRequest } from "../types";

export const ServiceRequestDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [item, setItem] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canConvert = hasAnyRole(user?.roles, ["MANAGER", "ADMIN"]);

  const load = async () => {
    if (!id) {
      setError("Invalid service request id.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<ServiceRequest>(`/service-requests/${id}`);
      setItem(response.data);
    } catch {
      setError("Failed to load service request.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const convertToWorkOrder = async () => {
    if (!id || !canConvert || item?.work_order_id) return;
    setConverting(true);
    setError(null);
    try {
      await api.post(`/service-requests/${id}/convert-to-wo`);
      await load();
    } catch {
      setError("Conversion failed. Request may already be converted.");
    } finally {
      setConverting(false);
    }
  };

  return (
    <AppShell title="Service Request Detail">
      <section className="rounded-2xl bg-fsm-panel shadow p-6">
        <Link to="/service-requests" className="text-sm underline">
          Back to Service Requests
        </Link>
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        {loading ? (
          <p className="text-slate-600 mt-3">Loading...</p>
        ) : !item ? (
          <p className="text-slate-600 mt-3">Service request not found.</p>
        ) : (
          <div className="mt-4 space-y-4">
            <h2 className="text-xl font-semibold">SR-{item.sr_number}</h2>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="rounded border p-3">
                <p>
                  <strong>Requestor:</strong> {item.requestor_name}
                </p>
                <p>
                  <strong>Contact:</strong> {item.contact_info}
                </p>
                <p>
                  <strong>Status:</strong> {item.status}
                </p>
                <p>
                  <strong>Urgency:</strong> {item.urgency}
                </p>
              </div>
              <div className="rounded border p-3">
                <p>
                  <strong>Building:</strong> {item.building}
                </p>
                <p>
                  <strong>Room / Area:</strong> {item.area}
                </p>
                <p>
                  <strong>Created:</strong> {new Date(item.created_at).toLocaleString()}
                </p>
                <p>
                  <strong>Updated:</strong>{" "}
                  {item.updated_at ? new Date(item.updated_at).toLocaleString() : "-"}
                </p>
              </div>
            </div>
            <article className="rounded border p-3">
              <p className="font-semibold mb-2">Description</p>
              <p className="text-sm">{item.description}</p>
            </article>
            {item.work_order_id && (
              <article className="rounded border p-3 bg-white/60">
                <p className="font-semibold mb-1">Converted Work Order</p>
                <Link className="underline" to={`/work-orders/${item.work_order_id}`}>
                  {item.work_order_number ? `WO-${item.work_order_number}` : "View Work Order"}
                </Link>
              </article>
            )}
            {!item.work_order_id && canConvert && (
              <article className="rounded border p-3 bg-white/60">
                <p className="font-semibold mb-2">Actions</p>
                <button
                  className="rounded bg-fsm-accent text-white px-3 py-2 text-sm hover:bg-fsm-accentDark disabled:opacity-50"
                  onClick={() => void convertToWorkOrder()}
                  disabled={converting || item.status === "CONVERTED"}
                >
                  {converting ? "Converting..." : "Convert to Work Order"}
                </button>
              </article>
            )}
          </div>
        )}
      </section>
    </AppShell>
  );
};
