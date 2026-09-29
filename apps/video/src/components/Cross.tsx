import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

// Red ✕ stamp used for the "fake solutions" beats.
export const Cross: React.FC<{ at: number; size?: number }> = ({
  at,
  size = 150,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: frame - at,
    fps,
    config: { damping: 8, stiffness: 380, mass: 0.5 },
  });

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 99,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(244,63,94,0.14)",
        border: `4px solid ${theme.red}`,
        transform: `scale(${s}) rotate(${(1 - s) * -45}deg)`,
        opacity: Math.min(1, s * 2),
      }}
    >
      <svg width={size * 0.45} height={size * 0.45} viewBox="0 0 24 24">
        <path
          d="M5 5 L19 19 M19 5 L5 19"
          stroke={theme.red}
          strokeWidth={3.2}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};
