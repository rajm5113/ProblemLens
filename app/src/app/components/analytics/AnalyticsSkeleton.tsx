import { useTheme } from "../../contexts/ThemeContext";

export function AnalyticsSkeleton() {
  const { C } = useTheme();

  return (
    <div
      aria-hidden="true"
      style={{
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          style={{
            height: index === 0 ? "90px" : "180px",
            borderRadius: "16px",
            backgroundColor: C.cardBg,
            border: `1px solid ${C.borderSubtle}`,
            animation: "pl-pulse 1.4s ease-in-out infinite",
            animationDelay: `${index * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}
