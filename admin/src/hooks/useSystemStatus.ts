import { useState, useEffect } from "react";

interface SystemStatus {
  agentsTotal: number;
  agentsOnline: number;
  tasksPending: number;
  tasksInProgress: number;
  tasksDone: number;
}

const EMPTY: SystemStatus = {
  agentsTotal: 0,
  agentsOnline: 0,
  tasksPending: 0,
  tasksInProgress: 0,
  tasksDone: 0,
};

export function useSystemStatus(intervalMs = 10_000) {
  const [status, setStatus] = useState<SystemStatus>(EMPTY);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const token = localStorage.getItem("konoha_token") || "";
        const res = await fetch("/api/admin/system", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`${res.status}`);
        const data: SystemStatus = await res.json();
        if (!cancelled) {
          setStatus(data);
          setConnected(true);
        }
      } catch {
        if (!cancelled) setConnected(false);
      }
    }

    poll();
    const id = setInterval(poll, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs]);

  return { status, connected };
}
