import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { registerChunkLoadRecovery } from "./app/chunkLoadRecovery";
import { initializeSentry, Sentry } from "./observability/sentry";
import "./styles/index.css";

registerChunkLoadRecovery();
const sentryEnabled = initializeSentry();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installability degrades gracefully without a service worker.
    });
  });
}

const application = sentryEnabled ? (
  <Sentry.ErrorBoundary
    fallback={({ resetError }) => (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-card max-w-lg p-6 text-center">
          <h1 className="text-xl font-bold text-primary mb-2">Something went wrong</h1>
          <p className="text-sm text-secondary mb-4">
            The error was reported automatically. You can retry the page now.
          </p>
          <button className="btn-cyan px-4 py-2" onClick={resetError}>Retry</button>
        </div>
      </main>
    )}
  >
    <App />
  </Sentry.ErrorBoundary>
) : <App />;

createRoot(document.getElementById("root")!).render(application);
