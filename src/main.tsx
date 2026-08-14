import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { registerChunkLoadRecovery } from "./app/chunkLoadRecovery";
import "./styles/index.css";

registerChunkLoadRecovery();
createRoot(document.getElementById("root")!).render(<App />);
