import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// ── Interceptor global de fetch — redireciona /api/... para servidor configurado
const _origFetch = window.fetch.bind(window);
window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const serverUrl = (localStorage.getItem("sk_server_url") || "").replace(/\/$/, "");
  if (serverUrl && typeof input === "string" && input.startsWith("/api/")) {
    return _origFetch(serverUrl + input, init);
  }
  if (serverUrl && input instanceof URL && input.pathname.startsWith("/api/")) {
    return _origFetch(serverUrl + input.pathname + input.search, init);
  }
  return _origFetch(input, init);
};

createRoot(document.getElementById("root")!).render(<App />);
