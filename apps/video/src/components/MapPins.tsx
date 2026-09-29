import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

export type Pin = {
  label: string;
  x: number; // % of the map
  y: number;
  at: number; // frame the pin pops in
  dim?: boolean; // the viewer's own, boring pin
};

const W = 1300;
const H = 560;

// Stylised dark map with "friends" popping up as pins.
export const MapPins: React.FC<{ pins: Pin[] }> = ({ pins }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        position: "relative",
        width: W,
        height: H,
        borderRadius: 40,
        overflow: "hidden",
        background: "#12111c",
        boxShadow:
          "0 50px 120px -40px rgba(168,85,247,0.45), inset 0 0 0 2px rgba(255,255,255,0.06)",
      }}
    >
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: 14 }, (_, i) => (
          <line
            key={`v${i}`}
            x1={i * 100}
            y1={0}
            x2={i * 100}
            y2={H}
            stroke="rgba(255,255,255,0.04)"
          />
        ))}
        {Array.from({ length: 6 }, (_, i) => (
          <line
            key={`h${i}`}
            x1={0}
            y1={i * 100}
            x2={W}
            y2={i * 100}
            stroke="rgba(255,255,255,0.04)"
          />
        ))}
        <path
          d="M0 380 C 250 300, 420 470, 700 360 S 1100 180, 1300 260"
          stroke="rgba(255,255,255,0.09)"
          strokeWidth={14}
          fill="none"
        />
        <path
          d="M180 0 C 260 200, 120 320, 330 560"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={10}
          fill="none"
        />
        <path
          d="M900 0 C 850 180, 1050 330, 960 560"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={10}
          fill="none"
        />
      </svg>

      {pins.map((p) => {
        const pop = spring({
          frame: frame - p.at,
          fps,
          config: { damping: 8, stiffness: 340, mass: 0.5 },
        });
        return (
          <div
            key={p.label}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${p.y}%`,
              transform: `translate(-50%, -100%) scale(${pop})`,
              transformOrigin: "bottom center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              fontFamily: theme.font,
            }}
          >
            <div
              style={{
                padding: "10px 22px",
                borderRadius: 99,
                fontSize: 30,
                fontWeight: 700,
                color: p.dim ? theme.muted : "#fff",
                background: p.dim ? "#27272a" : theme.gradient,
                whiteSpace: "nowrap",
                boxShadow: p.dim ? "none" : "0 12px 30px rgba(236,72,153,0.4)",
              }}
            >
              {p.label}
            </div>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 99,
                background: p.dim ? "#52525b" : theme.pink,
                border: "4px solid #12111c",
                boxShadow: p.dim ? "none" : `0 0 0 10px rgba(244,114,182,0.25)`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
