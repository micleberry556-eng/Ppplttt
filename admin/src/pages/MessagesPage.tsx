import { useState, useEffect, useRef, useCallback } from "react";
import type { CSSProperties, FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Send, Hash, User, Users as UsersIcon } from "lucide-react";
import { useAgents } from "../hooks/useAgents";
import { fetchHistory, fetchChannels, sendMessage } from "../lib/api";
import type { Message } from "../lib/types";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const sidebar: CSSProperties = {
  width: "200px",
  borderRight: "1px solid #30363d",
  background: "#0d1117",
  display: "flex",
  flexDirection: "column",
  overflow: "auto",
  flexShrink: 0,
};

const chatArea: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const msgList: CSSProperties = {
  flex: 1,
  overflow: "auto",
  padding: "1rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
};

const inputBar: CSSProperties = {
  display: "flex",
  gap: "0.5rem",
  padding: "0.75rem 1rem",
  borderTop: "1px solid #30363d",
  background: "#161b22",
};

const inputField: CSSProperties = {
  flex: 1,
  padding: "0.5rem 0.75rem",
  background: "#0d1117",
  border: "1px solid #30363d",
  borderRadius: "6px",
  color: "#e1e4e8",
  fontSize: "0.875rem",
};

const sendBtn: CSSProperties = {
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

function sideItem(active: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.5rem 0.75rem",
    color: active ? "#58a6ff" : "#8b949e",
    background: active ? "rgba(88,166,255,0.08)" : "transparent",
    cursor: "pointer",
    fontSize: "0.8125rem",
    border: "none",
    width: "100%",
    textAlign: "left",
    fontFamily: "inherit",
  };
}

const sectionLabel: CSSProperties = {
  padding: "0.625rem 0.75rem 0.25rem",
  fontSize: "0.6875rem",
  fontWeight: 600,
  color: "#484f58",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------

function MessageBubble({ msg }: { msg: Message }) {
  const isAdmin = msg.from === "admin";
  return (
    <div
      style={{
        alignSelf: isAdmin ? "flex-end" : "flex-start",
        maxWidth: "70%",
      }}
    >
      <div
        style={{
          background: isAdmin ? "#238636" : "#21262d",
          padding: "0.5rem 0.75rem",
          borderRadius: "8px",
          fontSize: "0.875rem",
          lineHeight: 1.5,
        }}
      >
        {!isAdmin && (
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#58a6ff",
              marginBottom: "0.25rem",
            }}
          >
            {msg.from}
          </div>
        )}
        <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {msg.text}
        </div>
        {msg.attachments && msg.attachments.length > 0 && (
          <div
            style={{
              marginTop: "0.375rem",
              fontSize: "0.75rem",
              color: "#8b949e",
            }}
          >
            {msg.attachments.map((a, i) => (
              <span key={i}>
                [{a.name}]{i < msg.attachments!.length - 1 ? " " : ""}
              </span>
            ))}
          </div>
        )}
      </div>
      <div
        style={{
          fontSize: "0.6875rem",
          color: "#484f58",
          marginTop: "0.2rem",
          textAlign: isAdmin ? "right" : "left",
        }}
      >
        {msg.timestamp
          ? new Date(msg.timestamp).toLocaleTimeString()
          : ""}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function MessagesPage() {
  const { target: urlTarget } = useParams<{ target?: string }>();
  const navigate = useNavigate();
  const { agents } = useAgents(10_000);
  const [channels, setChannels] = useState<string[]>([]);
  const [target, setTarget] = useState(urlTarget || "");
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Load channels once
  useEffect(() => {
    fetchChannels().then(setChannels).catch(() => {});
  }, []);

  // Sync URL param
  useEffect(() => {
    if (urlTarget && urlTarget !== target) setTarget(urlTarget);
  }, [urlTarget, target]);

  // Load history when target changes
  const loadHistory = useCallback(async () => {
    if (!target) return;
    setLoading(true);
    try {
      const hist = await fetchHistory(target, 100);
      setMessages(hist);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [target]);

  useEffect(() => {
    loadHistory();
    // Poll for new messages every 3s
    const id = setInterval(loadHistory, 3_000);
    return () => clearInterval(id);
  }, [loadHistory]);

  // Auto-scroll
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  function selectTarget(t: string) {
    setTarget(t);
    navigate(`/messages/${t}`, { replace: true });
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !target) return;
    try {
      await sendMessage({ from: "admin", to: target, text: trimmed });
      setText("");
      // Refresh immediately
      await loadHistory();
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      style={{
        display: "flex",
        height: "calc(100vh - 48px - 3rem)",
        border: "1px solid #30363d",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      {/* Conversation list */}
      <div style={sidebar}>
        <div style={sectionLabel}>Agents</div>
        {agents.map((a) => (
          <button
            key={a.id}
            onClick={() => selectTarget(a.id)}
            style={sideItem(target === a.id)}
          >
            <User size={14} />
            {a.id}
          </button>
        ))}

        <div style={sectionLabel}>Channels</div>
        {channels.map((ch) => (
          <button
            key={ch}
            onClick={() => selectTarget(ch)}
            style={sideItem(target === ch)}
          >
            <Hash size={14} />
            {ch}
          </button>
        ))}

        <div style={{ ...sectionLabel, marginTop: "0.5rem" }}>Broadcast</div>
        <button
          onClick={() => selectTarget("all")}
          style={sideItem(target === "all")}
        >
          <UsersIcon size={14} />
          all
        </button>
      </div>

      {/* Chat */}
      <div style={chatArea}>
        {!target ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#484f58",
            }}
          >
            Select an agent or channel
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div
              style={{
                padding: "0.625rem 1rem",
                borderBottom: "1px solid #30363d",
                fontWeight: 600,
                fontSize: "0.9375rem",
                background: "#161b22",
              }}
            >
              {target}
            </div>

            {/* Messages */}
            <div ref={listRef} style={msgList}>
              {loading && messages.length === 0 && (
                <p style={{ color: "#8b949e", textAlign: "center" }}>
                  Loading...
                </p>
              )}
              {!loading && messages.length === 0 && (
                <p style={{ color: "#484f58", textAlign: "center" }}>
                  No messages yet
                </p>
              )}
              {messages.map((m, i) => (
                <MessageBubble key={m.id || i} msg={m} />
              ))}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} style={inputBar}>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Message ${target}...`}
                style={inputField}
              />
              <button type="submit" style={sendBtn}>
                <Send size={14} />
                Send
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
