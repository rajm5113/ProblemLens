import { LayoutGrid, BarChart2, Bookmark } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

interface BottomNavProps {
  active: "feed" | "saved" | "dashboard";
  onFeedTap: () => void;
  onSavedTap: () => void;
  onDashboardTap: () => void;
}

const ITEMS = [
  { id: "feed" as const, Icon: LayoutGrid, label: "Feed" },
  { id: "saved" as const, Icon: Bookmark, label: "Saved" },
  { id: "dashboard" as const, Icon: BarChart2, label: "Dashboard" },
];

export function BottomNav({ active, onFeedTap, onSavedTap, onDashboardTap }: BottomNavProps) {
  const { C } = useTheme();
  const handlers: Record<string, () => void> = {
    feed: onFeedTap,
    saved: onSavedTap,
    dashboard: onDashboardTap,
  };

  return (
    <nav
      aria-label="Main navigation"
      style={{
        height: "64px",
        flexShrink: 0,
        backgroundColor: C.appBg,
        borderTop: `1px solid ${C.borderSubtle}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        padding: "0 40px",
      }}
    >
      {ITEMS.map(({ id, Icon, label }) => {
        const isActive = id === active;
        return (
          <button
            key={id}
            onClick={handlers[id]}
            aria-label={label}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "3px",
              padding: "0 12px",
              minWidth: "56px",
              minHeight: "44px",
              justifyContent: "center",
            }}
          >
            <Icon
              size={22}
              color={isActive ? C.accent : C.textFaint}
              fill={isActive ? C.accent : "none"}
              strokeWidth={isActive ? 2 : 1.5}
            />
            <span
              style={{
                color: isActive ? C.accent : C.textFaint,
                fontSize: "10px",
                fontWeight: 500,
                lineHeight: 1,
              }}
            >
              {label}
            </span>
            {isActive && (
              <div
                style={{
                  width: "4px",
                  height: "4px",
                  borderRadius: "50%",
                  backgroundColor: C.accent,
                }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
