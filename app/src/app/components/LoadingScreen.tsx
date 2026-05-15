import { RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { useTheme } from "../contexts/ThemeContext";

export function LoadingScreen() {
  const { C } = useTheme();

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
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
          style={{ color: C.accent, display: "flex" }}
        >
          <RefreshCw size={22} />
        </motion.div>
        <span style={{ fontSize: "15px", fontWeight: 600 }}>Loading problems</span>
      </div>
    </div>
  );
}
