import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import {
  Circle,
  Send,
  RefreshCw,
  Clock,
  Cpu,
  Shield,
} from "lucide-react";
import { useAgents } from "../hooks/useAgents";
import { sendMessage } from "../lib/api";
import type { Agent } from "../lib/types";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const card: CSSProperties = {
  background: "#161b22",
  border: "1px solid #30363d",
  borderRadius: "8px",
  padding: "1rem 1.25rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
};

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
  gap: "1rem",
};

const tag: CSSProperties = {
  display: "inline-block",
  padding: "0.15rem 0.5rem",
  borderRadius: "12px",
  fontSize: "0.75rem",
  background: "rgba(88,166,255,0.12)",
  color: "#58a6ff",
  marginRight: "0.375rem",
};

const inputStyle: CSSProperties = {
  flex: 1,
  padding: "0.5rem 0.75rem",
  background: "#0d1117",
  border: "1px solid #30363d",
  borderRadius: "6px",
  color: "#e1e4e8",
  fontSize: "0.8125rem",
};

const btnPrimary: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.375rem",
  padding: "0.5rem 0.75rem",
  background: "#238636",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  fontSize: "0.8125rem",
  fontWeight: 600,
  cursor: "pointer",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ---------------------------------------------------------------------------
// Agent Card
// ---------------------------------------------------------------------------

function AgentCard({
  agent,
  onSend,
}: {
  agent: Agent;
  onSend: (to: string, text: string) => void;
}) {
  const [msg, setMsg] = useState("");
  const online = agent.status === "online";

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = msg.trim();
    if (!trimmed) return;
    onSend(agent.id, trimmed);
    setMsg("");
  }

  return (
    <div style={card}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Circle
            size={10}
            fill={online ? "#3fb950" : "#484f58"}
            stroke="none"
          />
          <span style={{ fontWeight: 600, fontSize: "0.9375rem" }}>
            {agent.name}
          </span>
          <span style={{ color: "#8b949e", fontSize: "0.8125rem" }}>
            ({agent.id})
          </span>
        </div>
        <span
          style={{
            fontSize: "0.75rem",
            color: online ? "#3fb950" : "#8b949e",
          }}
        >
          {online ? "online" : "offline"}
        </span>
      </div>

      {/* Meta */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          fontSize: "0.8125rem",
          color: "#8b949e",
        }}
      >
        <span
          style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
        >
          <Clock size={13} /> {timeAgo(agent.lastHeartbeat)}
        </span>
        {agent.model && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <Cpu size={13} /> {agent.model}
          </span>
        )}
      </div>

      {/* Roles */}
      {agent.roles.length > 0 && (
        <div>
          <Shield
            size={13}
            style={{ marginRight: "4px", verticalAlign: "middle" }}
            color="#8b949e"
          />
          {agent.roles.map((r) => (
            <span key={r} style={tag}>
              {r}
            </span>
          ))}
        </div>
      )}

      {/* Capabilities */}
      {agent.capabilities.length > 0 && (
        <div>
          {agent.capabilities.map((c) => (
            <span key={c} style={{ ...tag, background: "rgba(63,185,80,0.12)", color: "#3fb950" }}>
              {c}
            </span>
          ))}
        </div>
      )}

      {/* Quick message */}
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}
      >
        <input
          type="text"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder={`Message ${agent.id}...`}
          style={inputStyle}
        />
        <button type="submit" style={btnPrimary}>
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AgentsPage() {
  const { agents, loading, error, refresh } = useAgents();
  const [sendStatus, setSendStatus] = useState("");

  async function handleSend(to: string, text: string) {
    try {
      await sendMessage({ from: "admin", to, text });
      setSendStatus(`Sent to ${to}`);
      setTimeout(() => setSendStatus(""), 3000);
    } catch (e) {
      setSendStatus(
        `Error: ${e instanceof Error ? e.message : "send failed"}`,
      );
    }
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.25rem",
        }}
      >
        <h2 style={{ fontSize: "1.25rem", margin: 0 }}>Agents</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {sendStatus && (
            <span style={{ fontSize: "0.8125rem", color: "#3fb950" }}>
              {sendStatus}
            </span>
          )}
          <button
            onClick={refresh}
            style={{
              ...btnPrimary,
              background: "#21262d",
              fontWeight: 400,
            }}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* Content */}
      {loading && <p style={{ color: "#8b949e" }}>Loading agents...</p>}
      {error && <p style={{ color: "#f85149" }}>{error}</p>}

      {!loading && agents.length === 0 && (
        <p style={{ color: "#8b949e" }}>
          No agents registered. Start an agent and register it on the bus.
        </p>
      )}

      <div style={grid}>
        {agents.map((a) => (
          <AgentCard key={a.id} agent={a} onSend={handleSend} />
        ))}
      </div>
    </div>
  );
}
