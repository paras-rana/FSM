import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../components/AppShell";
import { api } from "../modules/api/client";
import { useAuth } from "../modules/auth/AuthContext";
import { hasAnyRole } from "../modules/auth/roles";
import type { PageAccessKey, RoleName } from "../types";

type AdminUser = {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  roles: RoleName[];
};

type RoleOption = {
  id: string;
  name: RoleName;
};
type PageAccessResponse = {
  userId: string;
  pages: PageAccessKey[];
};

export const AdminUsersPage = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [pages, setPages] = useState<PageAccessKey[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, RoleName[]>>({});
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedPages, setSelectedPages] = useState<PageAccessKey[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPages, setSavingPages] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    fullName: "",
    password: ""
  });

  const isAdmin = useMemo(() => hasAnyRole(user?.roles, ["ADMIN"]), [user?.roles]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.get<AdminUser[]>("/users"),
        api.get<RoleOption[]>("/users/roles")
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
      const pagesRes = await api.get<PageAccessKey[]>("/users/pages");
      setPages(pagesRes.data);
      const draft: Record<string, RoleName[]> = {};
      for (const u of usersRes.data) {
        draft[u.id] = u.roles;
      }
      setSelectedRoles(draft);
      const firstUserId = usersRes.data[0]?.id ?? "";
      setSelectedUserId((prev) => prev || firstUserId);
    } catch {
      setError("Failed to load users/roles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    void load();
  }, [isAdmin]);

  useEffect(() => {
    if (!selectedUserId) {
      setSelectedPages([]);
      return;
    }
    const loadPageAccess = async () => {
      try {
        const response = await api.get<PageAccessResponse>(`/users/${selectedUserId}/page-access`);
        setSelectedPages(response.data.pages);
      } catch {
        setError("Failed to load page access.");
      }
    };
    void loadPageAccess();
  }, [selectedUserId]);

  const createUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    setError(null);
    try {
      await api.post("/users", newUser);
      setNewUser({ email: "", fullName: "", password: "" });
      await load();
    } catch {
      setError("Failed to create user.");
    } finally {
      setSaving(false);
    }
  };

  const toggleRole = (userId: string, role: RoleName) => {
    setSelectedRoles((prev) => {
      const current = prev[userId] ?? [];
      const next = current.includes(role) ? current.filter((r) => r !== role) : [...current, role];
      return { ...prev, [userId]: next };
    });
  };

  const saveRoles = async (userId: string) => {
    const nextRoles = selectedRoles[userId] ?? [];
    if (nextRoles.length === 0) {
      setError("User must have at least one role.");
      return;
    }
    setError(null);
    try {
      await api.post(`/users/${userId}/roles`, { roles: nextRoles });
      await load();
    } catch {
      setError("Failed to update roles.");
    }
  };

  const resetPassword = async (userId: string) => {
    const newPassword = passwordDrafts[userId];
    if (!newPassword || newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setError(null);
    try {
      await api.patch(`/users/${userId}/password`, { newPassword });
      setPasswordDrafts((prev) => ({ ...prev, [userId]: "" }));
    } catch {
      setError("Failed to reset password.");
    }
  };

  const togglePageAccess = (page: PageAccessKey) => {
    setSelectedPages((prev) =>
      prev.includes(page) ? prev.filter((p) => p !== page) : [...prev, page]
    );
  };

  const savePageAccess = async () => {
    if (!selectedUserId) return;
    setSavingPages(true);
    setError(null);
    try {
      await api.post(`/users/${selectedUserId}/page-access`, {
        pages: selectedPages
      });
    } catch {
      setError("Failed to update page access.");
    } finally {
      setSavingPages(false);
    }
  };

  const selectedUser = users.find((u) => u.id === selectedUserId);

  if (!isAdmin) {
    return (
      <AppShell title="Admin Users">
        <section className="rounded-2xl bg-fsm-panel shadow p-6">
          <p className="text-red-600">Admin access required.</p>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell title="Admin Users">
      <section className="rounded-2xl bg-fsm-panel shadow p-6">
        <h2 className="text-xl font-semibold">Create User</h2>
        <form className="mt-4 grid md:grid-cols-4 gap-3" onSubmit={createUser}>
          <input
            type="email"
            placeholder="Email"
            className="rounded border px-3 py-2"
            value={newUser.email}
            onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
            required
          />
          <input
            placeholder="Full Name"
            className="rounded border px-3 py-2"
            value={newUser.fullName}
            onChange={(e) => setNewUser((p) => ({ ...p, fullName: e.target.value }))}
            required
          />
          <input
            type="password"
            placeholder="Initial Password"
            className="rounded border px-3 py-2"
            value={newUser.password}
            onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
            required
          />
          <button
            className="rounded bg-fsm-accent text-white px-3 py-2 hover:bg-fsm-accentDark disabled:opacity-50"
            disabled={saving}
          >
            {saving ? "Creating..." : "Create"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl bg-fsm-panel shadow p-6">
        <h2 className="text-xl font-semibold mb-3">Users</h2>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        {loading ? (
          <p className="text-slate-600">Loading...</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Roles</th>
                  <th className="py-2 pr-3">Password Reset</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b last:border-0 align-top">
                    <td className="py-2 pr-3">{u.email}</td>
                    <td className="py-2 pr-3">{u.full_name}</td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap gap-2">
                        {roles.map((r) => (
                          <label key={r.id} className="inline-flex items-center gap-1 text-xs border rounded px-2 py-1">
                            <input
                              type="checkbox"
                              checked={(selectedRoles[u.id] ?? []).includes(r.name)}
                              onChange={() => toggleRole(u.id, r.name)}
                            />
                            {r.name}
                          </label>
                        ))}
                        <button
                          className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                          onClick={() => void saveRoles(u.id)}
                        >
                          Save Roles
                        </button>
                      </div>
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex gap-2">
                        <input
                          type="password"
                          placeholder="New password"
                          className="rounded border px-2 py-1"
                          value={passwordDrafts[u.id] ?? ""}
                          onChange={(e) =>
                            setPasswordDrafts((prev) => ({ ...prev, [u.id]: e.target.value }))
                          }
                        />
                        <button
                          className="rounded border px-2 py-1 hover:bg-slate-50"
                          onClick={() => void resetPassword(u.id)}
                        >
                          Reset
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-fsm-panel shadow p-6">
        <h2 className="text-xl font-semibold mb-3">Page Access Management</h2>
        <div className="grid md:grid-cols-2 gap-3 mb-4">
          <label className="grid gap-1">
            <span className="text-sm text-slate-700">Select User</span>
            <select
              className="rounded border px-3 py-2"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.email})
                </option>
              ))}
            </select>
          </label>
          <div className="text-sm text-slate-600 self-end">
            {selectedUser ? `Editing access for ${selectedUser.full_name}` : "No user selected"}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {pages.map((page) => (
            <label key={page} className="inline-flex items-center gap-2 rounded border px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={selectedPages.includes(page)}
                onChange={() => togglePageAccess(page)}
              />
              {page.replace(/-/g, " ")}
            </label>
          ))}
        </div>

        <button
          className="rounded bg-fsm-accent text-white px-3 py-2 hover:bg-fsm-accentDark disabled:opacity-50"
          onClick={() => void savePageAccess()}
          disabled={!selectedUserId || savingPages}
        >
          {savingPages ? "Saving..." : "Save Page Access"}
        </button>
      </section>
    </AppShell>
  );
};
