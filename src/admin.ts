/**
 * Admin panel backend routes.
 *
 * Provides:
 * - Task management (CRUD, stored in Redis)
 * - Static file serving for the built admin SPA
 * - Project/workspace browsing
 */

import { Hono } from "hono";
import { readdirSync, readFileSync, statSync, existsSync } from "fs";
import { join, extname } from "path";
import { redis, sendMessage, listAgents } from "./redis";

const TASKS_KEY = "konoha:tasks";
const TASK_COUNTER_KEY = "konoha:task_counter";

export interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string;
  status: "pending" | "in_progress" | "done" | "failed";
  createdAt: string;
  updatedAt: string;
  result?: string;
}

// ---------------------------------------------------------------------------
// Task helpers
// ---------------------------------------------------------------------------

async function nextTaskId(): Promise<string> {
  const n = await redis.incr(TASK_COUNTER_KEY);
  return `task-${n}`;
}

async function getAllTasks(): Promise<Task[]> {
  const all = await redis.hgetall(TASKS_KEY);
  return Object.values(all).map((v) => JSON.parse(v) as Task);
}

async function getTask(id: string): Promise<Task | null> {
  const raw = await redis.hget(TASKS_KEY, id);
  return raw ? (JSON.parse(raw) as Task) : null;
}

async function saveTask(task: Task): Promise<void> {
  await redis.hset(TASKS_KEY, task.id, JSON.stringify(task));
}

async function deleteTask(id: string): Promise<void> {
  await redis.hdel(TASKS_KEY, id);
}

// ---------------------------------------------------------------------------
// Admin Hono sub-app
// ---------------------------------------------------------------------------

export function createAdminRoutes(): Hono {
  const admin = new Hono();

  // ---- Tasks CRUD ----

  admin.get("/admin/tasks", async (c) => {
    const tasks = await getAllTasks();
    // Sort newest first
    tasks.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return c.json(tasks);
  });

  admin.get("/admin/tasks/:id", async (c) => {
    const task = await getTask(c.req.param("id"));
    if (!task) return c.json({ error: "Task not found" }, 404);
    return c.json(task);
  });

  admin.post("/admin/tasks", async (c) => {
    const body = await c.req.json();
    const { title, description, assignee } = body;
    if (!title || !assignee) {
      return c.json({ error: "title and assignee required" }, 400);
    }

    const id = await nextTaskId();
    const now = new Date().toISOString();
    const task: Task = {
      id,
      title,
      description: description || "",
      assignee,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };
    await saveTask(task);

    // Notify the assigned agent via the bus
    await sendMessage({
      from: "admin",
      to: assignee,
      type: "task",
      text: `New task [${id}]: ${title}\n\n${description || ""}`,
    });

    return c.json(task, 201);
  });

  admin.patch("/admin/tasks/:id", async (c) => {
    const task = await getTask(c.req.param("id"));
    if (!task) return c.json({ error: "Task not found" }, 404);

    const body = await c.req.json();
    if (body.status) task.status = body.status;
    if (body.result !== undefined) task.result = body.result;
    if (body.title) task.title = body.title;
    if (body.description !== undefined) task.description = body.description;
    if (body.assignee) task.assignee = body.assignee;
    task.updatedAt = new Date().toISOString();

    await saveTask(task);
    return c.json(task);
  });

  admin.delete("/admin/tasks/:id", async (c) => {
    await deleteTask(c.req.param("id"));
    return c.json({ ok: true });
  });

  // ---- System info ----

  admin.get("/admin/system", async (c) => {
    const agents = await listAgents(false);
    const tasks = await getAllTasks();
    const online = agents.filter((a) => a.status === "online").length;
    return c.json({
      agentsTotal: agents.length,
      agentsOnline: online,
      tasksPending: tasks.filter((t) => t.status === "pending").length,
      tasksInProgress: tasks.filter((t) => t.status === "in_progress").length,
      tasksDone: tasks.filter((t) => t.status === "done").length,
    });
  });

  // ---- Project/workspace browser ----

  admin.get("/admin/files", async (c) => {
    const dir = c.req.query("path") || process.cwd();
    // Security: only allow browsing under home or /opt/shared
    const allowed = ["/home", "/opt/shared", process.cwd()];
    const isAllowed = allowed.some((prefix) => dir.startsWith(prefix));
    if (!isAllowed) {
      return c.json({ error: "Access denied" }, 403);
    }

    if (!existsSync(dir)) {
      return c.json({ error: "Path not found" }, 404);
    }

    const stat = statSync(dir);
    if (!stat.isDirectory()) {
      // Return file content
      const MAX_SIZE = 512 * 1024; // 512KB
      if (stat.size > MAX_SIZE) {
        return c.json({ error: "File too large to preview" }, 413);
      }
      const content = readFileSync(dir, "utf-8");
      return c.json({
        type: "file",
        path: dir,
        size: stat.size,
        content,
        extension: extname(dir),
      });
    }

    // Return directory listing
    const entries = readdirSync(dir, { withFileTypes: true })
      .filter((e) => !e.name.startsWith("."))
      .map((e) => ({
        name: e.name,
        isDirectory: e.isDirectory(),
        path: join(dir, e.name),
        size: e.isDirectory() ? 0 : statSync(join(dir, e.name)).size,
      }))
      .sort((a, b) => {
        // Directories first, then alphabetical
        if (a.isDirectory !== b.isDirectory)
          return a.isDirectory ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    return c.json({ type: "directory", path: dir, entries });
  });

  return admin;
}
