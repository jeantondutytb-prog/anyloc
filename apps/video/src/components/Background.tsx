import { AbsoluteFill, useCurrentFrame } from "remotion";
import { theme } from "../theme";

// Dark backdrop with the landing's pink/violet glows, drifting slowly.
export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 40) * 90;

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width: 1100,
          height: 700,
          left: 410 + drift,
          top: 120,
          borderRadius: "50%",
          background: "rgba(236, 72, 153, 0.16)",
          filter: "blur(160px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 500,
          right: -100 - drift,
          top: -150,
          borderRadius: "50%",
          background: "rgba(139, 92, 246, 0.18)",
          filter: "blur(140px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 400,
          left: -120,
          bottom: -140,
          borderRadius: "50%",
          background: "rgba(249, 115, 22, 0.08)",
          filter: "blur(140px)",
        }}
      />
    </AbsoluteFill>
  );
};
