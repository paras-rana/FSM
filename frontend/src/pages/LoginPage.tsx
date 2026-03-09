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
    <main className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="min-h-[calc(100vh-2rem)] md:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4rem)] overflow-hidden rounded-3xl border border-cyan-200/70 bg-white/25 shadow-2xl backdrop-blur-sm lg:grid lg:grid-cols-[minmax(0,1fr)_460px]">
        <section
          className="relative hidden lg:flex"
          style={{
            backgroundImage:
              "linear-gradient(120deg, rgba(17,24,39,0.55), rgba(30,64,175,0.35)), url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1800&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-black/45 via-transparent to-black/10" />
          <div className="relative mt-auto max-w-3xl p-12 xl:p-16 text-white">
            <p className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight">
              "Great management turns daily operations into long-term value."
            </p>
            <p className="mt-5 text-lg font-medium text-white/90">
              Operations Leadership Principle
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center p-6 md:p-10 bg-fsm-panel/85">
          <div className="w-full max-w-md rounded-2xl border border-cyan-200/70 bg-white p-8 shadow-xl">
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
                className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 text-white py-2 font-semibold hover:from-cyan-600 hover:to-emerald-600 disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
};
