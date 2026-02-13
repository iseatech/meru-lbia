import { createContext, useContext, useState, useCallback } from "react";

const AUTH_KEY = "meru_demo_logged_in";

interface AuthContextType {
  loggedIn: boolean;
  login: () => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  loggedIn: false,
  login: () => {},
  logout: () => {},
});

export function useAuthProvider() {
  const [loggedIn, setLoggedIn] = useState(() => {
    return localStorage.getItem(AUTH_KEY) === "true";
  });

  const login = useCallback(() => {
    localStorage.setItem(AUTH_KEY, "true");
    setLoggedIn(true);
  }, []);

  const logout = useCallback(() => {
    localStorage.setItem(AUTH_KEY, "false");
    setLoggedIn(false);
  }, []);

  return { loggedIn, login, logout };
}

export function useAuth() {
  return useContext(AuthContext);
}
