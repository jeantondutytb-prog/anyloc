import {
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

type Props = {
  // Screenshots from /public/proof, slid in one after the other.
  screens: string[];
  // Frames each screen stays on before the next one slides in.
  hold?: number;
  height?: number;
  // Shows a finger-tap ripple just before each screen change.
  taps?: boolean;
};

const SLIDE = 7;

// Minimal iPhone frame; the proof screenshots are 924×2000.
export const Phone: React.FC<Props> = ({
  screens,
  hold = 50,
  height = 860,
  taps,
}) => {
  const frame = useCurrentFrame();
  const width = Math.round(height * (924 / 2000)) + 28;
  const radius = height * 0.085;
  const bob = Math.sin(frame / 14) * 10;
  const tilt = Math.sin(frame / 22) * 5;

  return (
    <div
      style={{
        position: "relative",
        width,
        height: height + 28,
        transform: `perspective(1600px) translateY(${bob}px) rotateY(${tilt}deg) rotateZ(${tilt * 0.3}deg)`,
        borderRadius: radius + 14,
        padding: 14,
        background: "linear-gradient(160deg, #3f3f46, #18181b 40%, #27272a)",
        boxShadow:
          "0 60px 120px -30px rgba(236,72,153,0.45), 0 30px 60px -20px rgba(0,0,0,0.8), inset 0 0 0 2px rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: radius,
          overflow: "hidden",
          background: "#000",
        }}
      >
        {screens.map((src, i) => {
          const inAt = i * hold;
          const x =
            i === 0
              ? 0
              : interpolate(frame, [inAt, inAt + SLIDE], [100, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.out(Easing.cubic),
                });
          return (
            <Img
              key={src}
              src={staticFile(src)}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `translateX(${x}%)`,
              }}
            />
          );
        })}
        {taps &&
          screens.slice(1).map((src, i) => {
            const t = frame - ((i + 1) * hold - 5);
            if (t < 0 || t > 14) return null;
            const size = interpolate(t, [0, 14], [30, 190]);
            return (
              <div
                key={src}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "45%",
                  width: size,
                  height: size,
                  transform: "translate(-50%, -50%)",
                  borderRadius: 99,
                  border: "6px solid rgba(255,255,255,0.9)",
                  background: "rgba(244,114,182,0.35)",
                  opacity: interpolate(t, [0, 14], [1, 0]),
                }}
              />
            );
          })}
        <div
          style={{
            position: "absolute",
            top: height * 0.014,
            left: "50%",
            transform: "translateX(-50%)",
            width: width * 0.3,
            height: height * 0.036,
            borderRadius: 99,
            background: "#000",
          }}
        />
      </div>
    </div>
  );
};
