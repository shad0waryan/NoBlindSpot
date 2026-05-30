import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authAPI } from "../services/api";
import { useTheme } from "./ThemeContext";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { syncTheme } = useTheme();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const applyUser = useCallback((u) => {
    setUser(u);
    if (u?.preferences?.theme) syncTheme(u.preferences.theme);
  }, [syncTheme]);

  useEffect(() => {
    const token = localStorage.getItem("nbs_token");
    if (!token) { setLoading(false); return; }

    authAPI.getMe()
      .then(({ data }) => applyUser(data.user))
      .catch(() => {
        localStorage.removeItem("nbs_token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [applyUser]);

  const login = useCallback(async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    localStorage.setItem("nbs_token", data.token);
    applyUser(data.user);
    return data;
  }, [applyUser]);

  const register = useCallback(async (name, email, password) => {
    const { data } = await authAPI.register({ name, email, password });
    localStorage.setItem("nbs_token", data.token);
    applyUser(data.user);
    return data;
  }, [applyUser]);

  const logout = useCallback(() => {
    localStorage.removeItem("nbs_token");
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
    if (updatedUser?.preferences?.theme) syncTheme(updatedUser.preferences.theme);
  }, [syncTheme]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
