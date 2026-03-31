import type { Agent, Message } from "./types";

const BASE = "/api";

function headers(): HeadersInit {
  const token = localStorage.getItem("konoha_token") || "";
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function fetchAgents(onlineOnly = false): Promise<Agent[]> {
  const res = await fetch(
    `${BASE}/agents${onlineOnly ? "?online=true" : ""}`,
    { headers: headers() },
  );
  if (!res.ok) throw new Error(`Failed to fetch agents: ${res.status}`);
  return res.json();
}

export async function sendMessage(msg: {
  from: string;
  to: string;
  text: string;
  type?: string;
  channel?: string;
}): Promise<{ id: string }> {
  const res = await fetch(`${BASE}/messages`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(msg),
  });
  if (!res.ok) throw new Error(`Failed to send message: ${res.status}`);
  return res.json();
}

export async function fetchHistory(
  target: string,
  count = 50,
): Promise<Message[]> {
  const res = await fetch(
    `${BASE}/messages/${target}/history?count=${count}`,
    { headers: headers() },
  );
  if (!res.ok) throw new Error(`Failed to fetch history: ${res.status}`);
  return res.json();
}

export async function fetchChannels(): Promise<string[]> {
  const res = await fetch(`${BASE}/channels`, { headers: headers() });
  if (!res.ok) throw new Error(`Failed to fetch channels: ${res.status}`);
  return res.json();
}

export function createSSEStream(
  agentId: string,
  onMessage: (msg: Message) => void,
): EventSource {
  const token = localStorage.getItem("konoha_token") || "";
  const es = new EventSource(
    `${BASE}/messages/${agentId}/stream?token=${token}`,
  );
  es.addEventListener("message", (e) => {
    try {
      const msg: Message = JSON.parse(e.data);
      onMessage(msg);
    } catch {
      /* ignore parse errors */
    }
  });
  return es;
}

export async function fetchHealth(): Promise<{
  status: string;
  ts: string;
}> {
  const res = await fetch(`${BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}
