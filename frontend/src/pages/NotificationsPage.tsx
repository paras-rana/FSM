import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../components/AppShell";
import { api } from "../modules/api/client";
import { useAuth } from "../modules/auth/AuthContext";
import { hasAnyRole } from "../modules/auth/roles";
import type { NotificationItem } from "../types";

export const NotificationsPage = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = useMemo(() => hasAnyRole(user?.roles, ["ADMIN"]), [user?.roles]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<NotificationItem[]>(
        `/notifications${unreadOnly ? "?unread=true" : ""}`
      );
      setItems(response.data);
    } catch {
      setError("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [unreadOnly]);

  const markRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      await load();
    } catch {
      setError("Failed to mark notification as read.");
    }
  };

  const markAllRead = async () => {
    try {
      await api.post("/notifications/read-all");
      await load();
    } catch {
      setError("Failed to mark all notifications as read.");
    }
  };

  const createTestNotification = async () => {
    try {
      await api.post("/notifications/test");
      await load();
    } catch {
      setError("Failed to create test notification.");
    }
  };

  return (
    <AppShell title="Notifications">
      <section className="rounded-2xl bg-fsm-panel shadow p-6">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <h2 className="text-xl font-semibold">In-App Notifications</h2>
          <div className="flex flex-wrap gap-2">
            <button className="rounded border px-3 py-2 text-sm hover:bg-slate-50" onClick={() => setUnreadOnly((x) => !x)}>
              {unreadOnly ? "Show All" : "Show Unread"}
            </button>
            <button className="rounded border px-3 py-2 text-sm hover:bg-slate-50" onClick={() => void markAllRead()}>
              Mark All Read
            </button>
            {isAdmin && (
              <button
                className="rounded bg-fsm-accent text-white px-3 py-2 text-sm hover:bg-fsm-accentDark"
                onClick={() => void createTestNotification()}
              >
                Create Test
              </button>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        {loading ? (
          <p className="text-slate-600 mt-4">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-slate-600 mt-4">No notifications found.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {items.map((item) => (
              <article key={item.id} className="rounded border p-4 bg-white">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-semibold">{item.type}</p>
                  <p className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</p>
                </div>
                <p className="mt-2 text-sm">{item.message}</p>
                {!item.is_read && (
                  <button
                    className="mt-3 rounded border px-2 py-1 text-xs hover:bg-slate-50"
                    onClick={() => void markRead(item.id)}
                  >
                    Mark Read
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
};

