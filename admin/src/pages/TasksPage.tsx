import { useState, useEffect, useCallback } from "react";
import type { CSSProperties, FormEvent } from "react";
import {
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useAgents } from "../hooks/useAgents";
import type { Task } from "../lib/types";

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

function headers(): HeadersInit {
  const token = localStorage.getItem("konoha_token") || "";
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function fetchTasks(): Promise<Task[]> {
  const res = await fetch("/api/admin/tasks", { headers: headers() });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

async function createTask(body: {
  title: string;
  description: string;
  assignee: string;
}): Promise<Task> {
  const res = await fetch("/api/admin/tasks", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

async function updateTask(
  id: string,
  body: Partial<Task>,
): Promise<Task> {
  const res = await fetch(`/api/admin/tasks/${id}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

async function deleteTask(id: string): Promise<void> {
  await fetch(`/api/admin/tasks/${id}`, {
    method: "DELETE",
    headers: headers(),
  });
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const card: CSSProperties = {
  background: "#161b22",
  border: "1px solid #30363d",
  borderRadius: "8px",
  padding: "1rem 1.25rem",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.75rem",
  background: "#0d1117",
  border: "1px solid #30363d",
  borderRadius: "6px",
  color: "#e1e4e8",
  fontSize: "0.875rem",
  boxSizing: "border-box",
  fontFamily: "inherit",
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

const btnSecondary: CSSProperties = {
  ...btnPrimary,
  background: "#21262d",
  fontWeight: 400,
};

const selectStyle: CSSProperties = {
  ...inputStyle,
  width: "auto",
  minWidth: "120px",
  appearance: "auto",
};

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const STATUS_ICON: Record<Task["status"], typeof Clock> = {
  pending: Clock,
  in_progress: Loader2,
  done: CheckCircle2,
  failed: AlertCircle,
};

const STATUS_COLOR: Record<Task["status"], string> = {
  pending: "#8b949e",
  in_progress: "#d29922",
  done: "#3fb950",
  failed: "#f85149",
};

const STATUS_LABEL: Record<Task["status"], string> = {
  pending: "Pending",
  in_progress: "In Progress",
  done: "Done",
  failed: "Failed",
};

// ---------------------------------------------------------------------------
// Task row
// ---------------------------------------------------------------------------

function TaskRow({
  task,
  onStatusChange,
  onDelete,
}: {
  task: Task;
  onStatusChange: (id: string, status: Task["status"]) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = STATUS_ICON[task.status];
  const color = STATUS_COLOR[task.status];

  return (
    <div style={card}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          cursor: "pointer",
        }}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown size={16} color="#8b949e" />
        ) : (
          <ChevronRight size={16} color="#8b949e" />
        )}
        <Icon size={16} color={color} />
        <span style={{ flex: 1, fontWeight: 600, fontSize: "0.9375rem" }}>
          {task.title}
        </span>
        <span
          style={{
            fontSize: "0.75rem",
            color,
            padding: "0.15rem 0.5rem",
            borderRadius: "12px",
            background: `${color}18`,
          }}
        >
          {STATUS_LABEL[task.status]}
        </span>
        <span style={{ fontSize: "0.75rem", color: "#8b949e" }}>
          {task.assignee}
        </span>
      </div>

      {expanded && (
        <div style={{ marginTop: "0.75rem", paddingLeft: "2rem" }}>
          {task.description && (
            <p
              style={{
                fontSize: "0.875rem",
                color: "#c9d1d9",
                whiteSpace: "pre-wrap",
                marginBottom: "0.75rem",
                lineHeight: 1.5,
              }}
            >
              {task.description}
            </p>
          )}

          {task.result && (
            <div
              style={{
                background: "#0d1117",
                border: "1px solid #30363d",
                borderRadius: "6px",
                padding: "0.75rem",
                fontSize: "0.8125rem",
                fontFamily: "monospace",
                whiteSpace: "pre-wrap",
                marginBottom: "0.75rem",
                color: "#8b949e",
              }}
            >
              {task.result}
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.8125rem",
            }}
          >
            <span style={{ color: "#8b949e" }}>Status:</span>
            <select
              value={task.status}
              onChange={(e) =>
                onStatusChange(task.id, e.target.value as Task["status"])
              }
              style={selectStyle}
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
              <option value="failed">Failed</option>
            </select>

            <button
              onClick={() => onDelete(task.id)}
              style={{
                ...btnSecondary,
                color: "#f85149",
                marginLeft: "auto",
              }}
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>

          <div
            style={{
              marginTop: "0.5rem",
              fontSize: "0.75rem",
              color: "#484f58",
            }}
          >
            Created: {new Date(task.createdAt).toLocaleString()} | Updated:{" "}
            {new Date(task.updatedAt).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// New task form
// ---------------------------------------------------------------------------

function NewTaskForm({
  agentIds,
  onCreated,
}: {
  agentIds: string[];
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState(agentIds[0] || "");
  const [submitting, setSubmitting] = useState(false);

  // Keep assignee in sync if agents load later
  useEffect(() => {
    if (!assignee && agentIds.length > 0) setAssignee(agentIds[0]);
  }, [agentIds, assignee]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !assignee) return;
    setSubmitting(true);
    try {
      await createTask({
        title: title.trim(),
        description: description.trim(),
        assignee,
      });
      setTitle("");
      setDescription("");
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        ...card,
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        marginBottom: "1.25rem",
      }}
    >
      <div style={{ fontWeight: 600, fontSize: "0.9375rem" }}>New Task</div>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title (e.g. Build a landing page)"
        style={inputStyle}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description / requirements..."
        rows={3}
        style={{ ...inputStyle, resize: "vertical" }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <span style={{ fontSize: "0.8125rem", color: "#8b949e" }}>
          Assign to:
        </span>
        <select
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          style={selectStyle}
        >
          {agentIds.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
        <button type="submit" disabled={submitting} style={btnPrimary}>
          <Plus size={14} />
          {submitting ? "Creating..." : "Create Task"}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function TasksPage() {
  const { agents } = useAgents(15_000);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await fetchTasks();
      setTasks(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5_000);
    return () => clearInterval(id);
  }, [load]);

  async function handleStatusChange(id: string, status: Task["status"]) {
    await updateTask(id, { status });
    await load();
  }

  async function handleDelete(id: string) {
    await deleteTask(id);
    await load();
  }

  const agentIds = agents.map((a) => a.id);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.25rem",
        }}
      >
        <h2 style={{ fontSize: "1.25rem", margin: 0 }}>Tasks</h2>
        <button onClick={load} style={btnSecondary}>
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      <NewTaskForm agentIds={agentIds} onCreated={load} />

      {loading && <p style={{ color: "#8b949e" }}>Loading tasks...</p>}

      {!loading && tasks.length === 0 && (
        <p style={{ color: "#8b949e" }}>
          No tasks yet. Create one above to assign work to an agent.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {tasks.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
