import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../modules/auth/AuthContext";

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@fsm.local");
  const [password, setPassword] = useState("Admin123!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch {
      setError("Login failed. Check credentials and backend availability.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <section className="w-full max-w-md rounded-2xl bg-fsm-panel shadow-xl p-8">
        <h1 className="text-2xl font-bold">FSM Login</h1>
        <p className="text-slate-600 mt-2">Sign in to access your dashboard.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-fsm-accent text-white py-2 font-semibold hover:bg-fsm-accentDark disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </section>
    </main>
  );
};
