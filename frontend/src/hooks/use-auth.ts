"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { login as apiLogin } from "@/lib/api";
import { saveToken, getToken, clearToken, isAuthenticated } from "@/lib/auth";

interface UseAuthReturn {
  token: string | null;
  authenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (password: string) => Promise<void>;
  logout: () => void;
}

export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = getToken();
    if (stored) {
      setToken(stored);
      setAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const login = useCallback(
    async (password: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiLogin(password);
        saveToken(response.access_token);
        setToken(response.access_token);
        setAuthenticated(true);
        router.push("/dashboard");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Login failed";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  const logout = useCallback(() => {
    clearToken();
    setToken(null);
    setAuthenticated(false);
    router.push("/login");
  }, [router]);

  return { token, authenticated, loading, error, login, logout };
}
