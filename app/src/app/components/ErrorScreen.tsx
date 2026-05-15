import { RefreshCw, WifiOff } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

interface ErrorScreenProps {
  message: string;
  onRetry: () => void;
}

export function ErrorScreen({ message, onRetry }: ErrorScreenProps) {
  const { C } = useTheme();
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
  const displayMessage = isOffline
    ? "You're offline. Connect to the internet to load the latest problems."
    : message;

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        backgroundColor: C.appBg,
        color: C.textPrimary,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "'Inter', sans-serif",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: "360px", textAlign: "center" }}>
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            backgroundColor: C.emptyIconBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 18px",
            color: C.textFaint,
          }}
        >
          <WifiOff size={28} />
        </div>
        <h1
          style={{
            fontFamily: "'Outfit', 'Inter', sans-serif",
            fontSize: "24px",
            fontWeight: 700,
            lineHeight: 1.25,
            margin: "0 0 10px",
          }}
        >
          Could not load problems
        </h1>
        <p style={{ color: C.textMuted, fontSize: "14px", lineHeight: 1.5, margin: "0 0 22px" }}>
          {displayMessage}
        </p>
        <button
          onClick={onRetry}
          aria-label="Retry loading problems"
          style={{
            height: "46px",
            padding: "0 22px",
            border: "none",
            borderRadius: "12px",
            background: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`,
            color: "#FFFFFF",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: `0 4px 16px ${C.accentGlow}`,
          }}
        >
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
    </div>
  );
}
