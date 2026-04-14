export interface Agent {
  id: string;
  name: string;
  capabilities: string[];
  roles: string[];
  model?: string;
  status: "online" | "offline";
  lastHeartbeat: number;
}

export interface Message {
  id?: string;
  from: string;
  to: string;
  type: "message" | "task" | "result" | "status" | "event";
  text: string;
  channel?: string;
  replyTo?: string;
  timestamp?: string;
  attachments?: Attachment[];
}

export interface Attachment {
  name: string;
  path: string;
  mime?: string;
  size?: number;
}

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
