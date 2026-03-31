import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { AgentsPage } from "./pages/AgentsPage";
import { MessagesPage } from "./pages/MessagesPage";
import { TasksPage } from "./pages/TasksPage";
import { ProjectsPage } from "./pages/ProjectsPage";

export function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem("konoha_token") || "",
  );

  useEffect(() => {
    if (token) {
      localStorage.setItem("konoha_token", token);
    } else {
      localStorage.removeItem("konoha_token");
    }
  }, [token]);

  if (!token) {
    return <LoginPage onLogin={setToken} />;
  }

  return (
    <BrowserRouter>
      <Layout onLogout={() => setToken("")}>
        <Routes>
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/messages/:target" element={<MessagesPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="*" element={<Navigate to="/agents" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
