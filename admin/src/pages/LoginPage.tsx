import { useState } from "react";
import type { FormEvent } from "react";

export function LoginPage({ onLogin }: { onLogin: (token: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;

    setLoading(true);
    setError("");

    try {
      // Validate the token by calling /health (no auth) then /agents (requires auth)
      const res = await fetch("/api/agents", {
        headers: { Authorization: `Bearer ${trimmed}` },
      });
      if (res.status === 401 || res.status === 403) {
        setError("Invalid token");
        return;
      }
      if (!res.ok) {
        setError(`Server error: ${res.status}`);
        return;
      }
      onLogin(trimmed);
    } catch {
      setError("Cannot connect to server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f1117",
        color: "#e1e4e8",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#161b22",
          padding: "2rem",
          borderRadius: "12px",
          border: "1px solid #30363d",
          width: "360px",
        }}
      >
        <h1
          style={{
            fontSize: "1.5rem",
            marginBottom: "0.5rem",
            textAlign: "center",
          }}
        >
          Konoha Admin
        </h1>
        <p
          style={{
            color: "#8b949e",
            fontSize: "0.875rem",
            textAlign: "center",
            marginBottom: "1.5rem",
          }}
        >
          Enter your KONOHA_TOKEN to continue
        </p>
        {error && (
          <p
            style={{
              color: "#f85149",
              fontSize: "0.8125rem",
              textAlign: "center",
              marginBottom: "0.75rem",
            }}
          >
            {error}
          </p>
        )}
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Token"
          disabled={loading}
          style={{
            width: "100%",
            padding: "0.625rem 0.75rem",
            background: "#0d1117",
            border: `1px solid ${error ? "#f85149" : "#30363d"}`,
            borderRadius: "6px",
            color: "#e1e4e8",
            fontSize: "0.875rem",
            marginBottom: "1rem",
            boxSizing: "border-box",
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "0.625rem",
            background: loading ? "#1a7f37" : "#238636",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Checking..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
