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
type PersonaAccessMap = Record<RoleName, PageAccessKey[]>;

export const AdminUsersPage = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [pages, setPages] = useState<PageAccessKey[]>([]);
  const [personaAccess, setPersonaAccess] = useState<PersonaAccessMap | null>(null);
  const [personaAccessDraft, setPersonaAccessDraft] = useState<PersonaAccessMap | null>(null);
  const [editingPersonas, setEditingPersonas] = useState(false);
  const [savingPersonaAccess, setSavingPersonaAccess] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<Record<string, RoleName>>({});
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    fullName: "",
    password: "",
    persona: "TECHNICIAN" as RoleName
  });

  const isAdmin = useMemo(() => hasAnyRole(user?.roles, ["ADMIN"]), [user?.roles]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, rolesRes, pagesRes, personaAccessRes] = await Promise.all([
        api.get<AdminUser[]>("/users"),
        api.get<RoleOption[]>("/users/roles"),
        api.get<PageAccessKey[]>("/users/pages"),
        api.get<PersonaAccessMap>("/users/persona-access")
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
      setPages(pagesRes.data);
      setPersonaAccess(personaAccessRes.data);
      setPersonaAccessDraft(personaAccessRes.data);
      const draft: Record<string, RoleName> = {};
      for (const u of usersRes.data) {
        draft[u.id] = u.roles[0] ?? "TECHNICIAN";
      }
      setSelectedPersona(draft);
    } catch {
      setError("Failed to load users/personas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    void load();
  }, [isAdmin]);

  const createUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    setError(null);
    try {
      await api.post("/users", newUser);
      setNewUser({ email: "", fullName: "", password: "", persona: "TECHNICIAN" });
      await load();
    } catch {
      setError("Failed to create user.");
    } finally {
      setSaving(false);
    }
  };

  const setPersonaDraft = (userId: string, persona: RoleName) => {
    setSelectedPersona((prev) => ({ ...prev, [userId]: persona }));
  };

  const savePersona = async (userId: string) => {
    const persona = selectedPersona[userId] ?? "TECHNICIAN";
    setError(null);
    try {
      await api.post(`/users/${userId}/roles`, { roles: [persona] });
      await load();
    } catch {
      setError("Failed to update persona.");
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

  const togglePersonaPage = (persona: RoleName, page: PageAccessKey) => {
    setPersonaAccessDraft((prev) => {
      if (!prev) return prev;
      const current = prev[persona] ?? [];
      const next = current.includes(page) ? current.filter((p) => p !== page) : [...current, page];
      return { ...prev, [persona]: next };
    });
  };

  const startEditingPersonas = () => {
    setPersonaAccessDraft(personaAccess);
    setEditingPersonas(true);
  };

  const savePersonaAccess = async () => {
    if (!personaAccessDraft) return;
    setSavingPersonaAccess(true);
    setError(null);
    try {
      await api.post("/users/persona-access", personaAccessDraft);
      setPersonaAccess(personaAccessDraft);
      setEditingPersonas(false);
    } catch {
      setError("Failed to update persona access.");
    } finally {
      setSavingPersonaAccess(false);
    }
  };

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
        <form className="mt-4 grid md:grid-cols-5 gap-3" onSubmit={createUser}>
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
          <select
            className="rounded border px-3 py-2"
            value={newUser.persona}
            onChange={(e) => setNewUser((p) => ({ ...p, persona: e.target.value as RoleName }))}
          >
            {roles.map((r) => (
              <option key={r.id} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
          <button
            className="rounded bg-fsm-accent text-white px-3 py-2 hover:bg-fsm-accentDark disabled:opacity-50"
            disabled={saving}
          >
            {saving ? "Creating..." : "Create"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl bg-fsm-panel shadow p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Persona Access</h2>
          {editingPersonas ? (
            <button
              className="rounded bg-fsm-accent text-white px-3 py-2 text-sm hover:bg-fsm-accentDark disabled:opacity-50"
              onClick={() => void savePersonaAccess()}
              disabled={savingPersonaAccess}
            >
              {savingPersonaAccess ? "Saving..." : "Save Persona Access"}
            </button>
          ) : (
            <button
              className="rounded border px-3 py-2 text-sm hover:bg-slate-50"
              onClick={startEditingPersonas}
            >
              Edit Personas
            </button>
          )}
        </div>
        {!personaAccess ? (
          <p className="text-slate-600">Loading...</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {(Object.keys(personaAccess) as RoleName[]).map((persona) => (
              <article key={persona} className="rounded border p-3">
                <h3 className="font-semibold mb-2">{persona}</h3>
                {editingPersonas && personaAccessDraft ? (
                  <div className="flex flex-wrap gap-2">
                    {pages.map((page) => (
                      <label key={`${persona}-${page}`} className="inline-flex items-center gap-2 rounded border px-2 py-1 text-xs">
                        <input
                          type="checkbox"
                          checked={(personaAccessDraft[persona] ?? []).includes(page)}
                          onChange={() => togglePersonaPage(persona, page)}
                        />
                        {page.replace(/-/g, " ")}
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-700">
                    {personaAccess[persona].map((page) => page.replace(/-/g, " ")).join(", ")}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
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
                  <th className="py-2 pr-3">Persona</th>
                  <th className="py-2 pr-3">Password Reset</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b last:border-0 align-top">
                    <td className="py-2 pr-3">{u.email}</td>
                    <td className="py-2 pr-3">{u.full_name}</td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap gap-2 items-center">
                        <select
                          className="rounded border px-2 py-1"
                          value={selectedPersona[u.id] ?? "TECHNICIAN"}
                          onChange={(e) => setPersonaDraft(u.id, e.target.value as RoleName)}
                        >
                          {roles.map((r) => (
                            <option key={r.id} value={r.name}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                        <button
                          className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                          onClick={() => void savePersona(u.id)}
                        >
                          Save Persona
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
    </AppShell>
  );
};
