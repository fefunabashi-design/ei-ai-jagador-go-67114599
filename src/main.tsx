import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Auto-recover from stale chunk hashes after a redeploy: when a dynamically
// imported module 404s, reload once so the browser fetches the new manifest.
const RELOAD_KEY = "__chunk_reload__";
const handleChunkError = (msg?: string) => {
  if (!msg) return;
  if (!/Failed to fetch dynamically imported module|Importing a module script failed/i.test(msg)) return;
  if (sessionStorage.getItem(RELOAD_KEY)) return;
  sessionStorage.setItem(RELOAD_KEY, "1");
  window.location.reload();
};
window.addEventListener("error", (e) => handleChunkError(e.message));
window.addEventListener("unhandledrejection", (e) => handleChunkError(String((e as any).reason?.message || e.reason)));
window.addEventListener("load", () => sessionStorage.removeItem(RELOAD_KEY));

createRoot(document.getElementById("root")!).render(<App />);
