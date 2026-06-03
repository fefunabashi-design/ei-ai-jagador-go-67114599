import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Auto-recover from stale chunk hashes after a redeploy: when a dynamically
// imported module 404s, reload so the browser fetches the new manifest.
// Use a timestamp to throttle reloads (avoid infinite loop) instead of a
// one-shot flag that the `load` event would immediately clear.
const RELOAD_KEY = "__chunk_reload_at__";
const RELOAD_THROTTLE_MS = 10_000;

const handleChunkError = (msg?: string) => {
  if (!msg) return;
  if (!/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(msg)) return;
  const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
  if (Date.now() - last < RELOAD_THROTTLE_MS) return;
  sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  window.location.reload();
};
window.addEventListener("error", (e) => handleChunkError(e.message));
window.addEventListener("unhandledrejection", (e) => handleChunkError(String((e as any).reason?.message || e.reason)));

createRoot(document.getElementById("root")!).render(<App />);
