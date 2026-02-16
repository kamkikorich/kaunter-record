"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/verify");
      const data = await response.json();
      setIsAuthenticated(data.authenticated);
      if (!data.authenticated) {
        setShowLogin(true);
      }
    } catch {
      setIsAuthenticated(false);
      setShowLogin(true);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.success) {
        setIsAuthenticated(true);
        setShowLogin(false);
        setPassword("");
      } else {
        setLoginError(data.message || "Log masuk gagal");
      }
    } catch {
      setLoginError("Ralat sistem");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
    } catch {
      // Ignore error
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Memuatkan...</div>
      </div>
    );
  }

  if (showLogin || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="card">
            <h1 className="text-xl font-bold text-slate-800 mb-4 text-center">
              Admin Log Masuk
            </h1>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="label" htmlFor="password">
                  Kata Laluan
                </label>
                <input
                  id="password"
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata laluan"
                  required
                  autoFocus
                />
              </div>

              {loginError && (
                <div className="status-error text-sm">{loginError}</div>
              )}

              <button
                type="submit"
                className="btn-primary w-full"
                disabled={loginLoading || !password}
              >
                {loginLoading ? "Memproses..." : "Log Masuk"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-800">
            Admin Dashboard
          </h1>
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="text-sm text-blue-600 hover:underline"
            >
              Laman Utama
            </a>
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:underline"
            >
              Log Keluar
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}