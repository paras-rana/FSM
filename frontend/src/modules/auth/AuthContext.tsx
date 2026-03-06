import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { api } from "../api/client";
import type { AuthUser } from "../../types";

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const loadUser = (): AuthUser | null => {
  const raw = localStorage.getItem("fsm_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(loadUser);
  const [token, setToken] = useState<string | null>(localStorage.getItem("fsm_token"));

  const login = async (email: string, password: string): Promise<void> => {
    const response = await api.post("/auth/login", { email, password });
    const nextToken = response.data.token as string;
    const nextUser = response.data.user as AuthUser;
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem("fsm_token", nextToken);
    localStorage.setItem("fsm_user", JSON.stringify(nextUser));
  };

  const logout = (): void => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("fsm_token");
    localStorage.removeItem("fsm_user");
  };

  const value = useMemo(
    () => ({
      user,
      token,
      login,
      logout
    }),
    [user, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
