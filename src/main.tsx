import { StrictMode, Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/liquid-ios27.css";
import App from "./App";
import { applySystemPreferences } from "./lib/systemPreferences";

const ACCENT_HSL: Record<string, string> = {
  green: "142 71% 45%",
  teal: "173 80% 40%",
  red: "0 72% 51%",
  orange: "25 95% 53%",
  amber: "38 92% 50%",
  yellow: "48 96% 53%",
  cyan: "192 91% 44%",
  blue: "217 91% 60%",
  indigo: "239 84% 67%",
  violet: "262 83% 58%",
  rose: "347 77% 50%",
  pink: "330 81% 60%",
};

applySystemPreferences();

(function initAccent() {
  let accent = localStorage.getItem("accent") || "green";
  if (accent === "violet" || accent === "purple") {
    accent = "green";
    localStorage.setItem("accent", "green");
  }

  const hsl = ACCENT_HSL[accent] || ACCENT_HSL.green;
  const style = document.createElement("style");
  style.id = "__accent_override__";
  style.textContent = `:root, .dark { --primary: ${hsl}; --ring: ${hsl}; }`;
  document.head.appendChild(style);
})();

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
          <div style={{ textAlign: "center", maxWidth: "20rem" }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: ".5rem" }}>
              Une erreur est survenue
            </h2>
            <p style={{ fontSize: ".875rem", opacity: .65, marginBottom: "1.25rem" }}>
              Rechargez l'application pour continuer.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: ".65rem 1rem", borderRadius: "999px", border: 0, background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", fontWeight: 700, cursor: "pointer" }}
            >
              Recharger
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
