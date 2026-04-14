import { useState, useEffect, useCallback } from "react";
import type { CSSProperties } from "react";
import {
  Folder,
  FileText,
  ChevronLeft,
  Home,
} from "lucide-react";

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

interface DirEntry {
  name: string;
  isDirectory: boolean;
  path: string;
  size: number;
}

interface DirResult {
  type: "directory";
  path: string;
  entries: DirEntry[];
}

interface FileResult {
  type: "file";
  path: string;
  size: number;
  content: string;
  extension: string;
}

type BrowseResult = DirResult | FileResult;

function headers(): HeadersInit {
  const token = localStorage.getItem("konoha_token") || "";
  return { Authorization: `Bearer ${token}` };
}

async function browse(path: string): Promise<BrowseResult> {
  const res = await fetch(
    `/api/admin/files?path=${encodeURIComponent(path)}`,
    { headers: headers() },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error || `HTTP ${res.status}`,
    );
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const container: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "calc(100vh - 48px - 3rem)",
};

const toolbar: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  padding: "0.5rem 0",
  marginBottom: "0.75rem",
  borderBottom: "1px solid #30363d",
};

const pathBar: CSSProperties = {
  flex: 1,
  fontSize: "0.8125rem",
  color: "#8b949e",
  fontFamily: "monospace",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const iconBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "32px",
  height: "32px",
  background: "#21262d",
  border: "1px solid #30363d",
  borderRadius: "6px",
  color: "#8b949e",
  cursor: "pointer",
};

const fileRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.625rem",
  padding: "0.5rem 0.75rem",
  borderBottom: "1px solid #21262d",
  cursor: "pointer",
  fontSize: "0.875rem",
};

const codeBlock: CSSProperties = {
  flex: 1,
  overflow: "auto",
  background: "#0d1117",
  border: "1px solid #30363d",
  borderRadius: "6px",
  padding: "1rem",
  fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
  fontSize: "0.8125rem",
  lineHeight: 1.6,
  whiteSpace: "pre",
  color: "#c9d1d9",
  tabSize: 2,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parentDir(path: string): string {
  const parts = path.split("/").filter(Boolean);
  parts.pop();
  return "/" + parts.join("/");
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ProjectsPage() {
  const [currentPath, setCurrentPath] = useState("/home/ubuntu");
  const [result, setResult] = useState<BrowseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await browse(path);
      setResult(data);
      setCurrentPath(path);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to browse");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(currentPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={container}>
      <h2 style={{ fontSize: "1.25rem", margin: "0 0 0.75rem" }}>Projects</h2>

      {/* Toolbar */}
      <div style={toolbar}>
        <button
          style={iconBtn}
          onClick={() => load(parentDir(currentPath))}
          title="Go up"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          style={iconBtn}
          onClick={() => load("/home/ubuntu")}
          title="Home"
        >
          <Home size={16} />
        </button>
        <div style={pathBar}>{currentPath}</div>
      </div>

      {/* Error */}
      {error && (
        <p style={{ color: "#f85149", fontSize: "0.875rem" }}>{error}</p>
      )}

      {/* Loading */}
      {loading && <p style={{ color: "#8b949e" }}>Loading...</p>}

      {/* Directory listing */}
      {result?.type === "directory" && (
        <div
          style={{
            flex: 1,
            overflow: "auto",
            background: "#161b22",
            border: "1px solid #30363d",
            borderRadius: "8px",
          }}
        >
          {result.entries.length === 0 && (
            <p
              style={{
                padding: "1rem",
                color: "#484f58",
                textAlign: "center",
              }}
            >
              Empty directory
            </p>
          )}
          {result.entries.map((entry) => (
            <div
              key={entry.path}
              style={fileRow}
              onClick={() => load(entry.path)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background =
                  "rgba(88,166,255,0.06)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background =
                  "transparent";
              }}
            >
              {entry.isDirectory ? (
                <Folder size={16} color="#58a6ff" />
              ) : (
                <FileText size={16} color="#8b949e" />
              )}
              <span style={{ flex: 1 }}>{entry.name}</span>
              {!entry.isDirectory && (
                <span style={{ fontSize: "0.75rem", color: "#484f58" }}>
                  {formatSize(entry.size)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* File preview */}
      {result?.type === "file" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "0.5rem",
            }}
          >
            <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>
              {currentPath.split("/").pop()}
            </span>
            <span style={{ fontSize: "0.75rem", color: "#8b949e" }}>
              {formatSize(result.size)} | {result.extension || "no ext"}
            </span>
          </div>
          <div style={codeBlock}>{result.content}</div>
        </div>
      )}
    </div>
  );
}
