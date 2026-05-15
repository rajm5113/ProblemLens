import { AnimatePresence, motion } from "motion/react";
import { RefreshCw } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

interface NewProblemsBannerProps {
  count: number;
  onDismiss: () => void | Promise<void>;
}

export function NewProblemsBanner({ count, onDismiss }: NewProblemsBannerProps) {
  const { C } = useTheme();

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.button
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          onClick={() => {
            void onDismiss();
          }}
          style={{
            position: "absolute",
            top: "12px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: C.accent,
            color: "#FFFFFF",
            border: "none",
            borderRadius: "24px",
            padding: "8px 16px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
            whiteSpace: "nowrap",
          }}
          aria-label={`Refresh to load ${count} new problem${count !== 1 ? "s" : ""}`}
        >
          <RefreshCw size={14} />
          {count} new problem{count !== 1 ? "s" : ""} - tap to refresh
        </motion.button>
      )}
    </AnimatePresence>
  );
}
