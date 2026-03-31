import type { ReactNode, CSSProperties } from "react";
import { NavLink } from "react-router-dom";
import {
  Users,
  MessageSquare,
  ListTodo,
  FolderOpen,
  LogOut,
  Circle,
} from "lucide-react";
import { useSystemStatus } from "../hooks/useSystemStatus";

const NAV_ITEMS = [
  { to: "/agents", label: "Agents", icon: Users },
  { to: "/messages", label: "Messages", icon: MessageSquare },
  { to: "/tasks", label: "Tasks", icon: ListTodo },
  { to: "/projects", label: "Projects", icon: FolderOpen },
] as const;

const FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

const styles = {
  root: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    background: "#0f1117",
    color: "#e1e4e8",
    fontFamily: FONT,
  } satisfies CSSProperties,

  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: "48px",
    padding: "0 1.25rem",
    background: "#161b22",
    borderBottom: "1px solid #30363d",
    flexShrink: 0,
  } satisfies CSSProperties,

  topLeft: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  } satisfies CSSProperties,

  topRight: {
    display: "flex",
    alignItems: "center",
    gap: "1.25rem",
    fontSize: "0.8125rem",
    color: "#8b949e",
  } satisfies CSSProperties,

  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.375rem",
    padding: "0.2rem 0.5rem",
    borderRadius: "12px",
    background: "rgba(88,166,255,0.1)",
    fontSize: "0.75rem",
    color: "#58a6ff",
  } satisfies CSSProperties,

  body: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  } satisfies CSSProperties,

  sidebar: {
    width: "200px",
    background: "#161b22",
    borderRight: "1px solid #30363d",
    display: "flex",
    flexDirection: "column",
    padding: "0.75rem 0",
    flexShrink: 0,
    overflow: "auto",
  } satisfies CSSProperties,

  main: {
    flex: 1,
    padding: "1.5rem",
    overflow: "auto",
  } satisfies CSSProperties,
};

function navStyle(isActive: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "0.625rem",
    padding: "0.5rem 1rem",
    color: isActive ? "#58a6ff" : "#8b949e",
    background: isActive ? "rgba(88,166,255,0.08)" : "transparent",
    textDecoration: "none",
    fontSize: "0.875rem",
    fontWeight: isActive ? 600 : 400,
    borderLeft: isActive ? "3px solid #58a6ff" : "3px solid transparent",
  };
}

export function Layout({
  children,
  onLogout,
}: {
  children: ReactNode;
  onLogout: () => void;
}) {
  const { status, connected } = useSystemStatus();

  return (
    <div style={styles.root}>
      {/* Top status bar */}
      <header style={styles.topBar}>
        <div style={styles.topLeft}>
          <span style={{ fontWeight: 700, fontSize: "1rem" }}>Konoha</span>
          <span style={{ color: "#8b949e", fontSize: "0.75rem" }}>
            Admin Panel
          </span>
        </div>
        <div style={styles.topRight}>
          <span style={styles.badge}>
            <Circle
              size={8}
              fill={connected ? "#3fb950" : "#f85149"}
              stroke="none"
            />
            {connected ? "Connected" : "Disconnected"}
          </span>
          <span>
            Agents: {status.agentsOnline}/{status.agentsTotal}
          </span>
          <span>Tasks: {status.tasksInProgress} active</span>
        </div>
      </header>

      <div style={styles.body}>
        {/* Sidebar */}
        <aside style={styles.sidebar}>
          <nav style={{ flex: 1 }}>
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                style={({ isActive }) => navStyle(isActive)}
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>

          <button
            onClick={onLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              padding: "0.5rem 1rem",
              color: "#8b949e",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "0.875rem",
              width: "100%",
              textAlign: "left",
              fontFamily: FONT,
            }}
          >
            <LogOut size={18} />
            Logout
          </button>
        </aside>

        {/* Main content */}
        <main style={styles.main}>{children}</main>
      </div>
    </div>
  );
}
