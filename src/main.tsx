
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import { AppErrorBoundary } from "./app/components/ErrorBoundary";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  );
