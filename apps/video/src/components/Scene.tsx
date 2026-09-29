import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// How a scene comes on screen — varied from one scene to the next.
//   punch — zooms in from slightly too close
//   whip  — whips in sideways with motion blur (dir: 1 = from right)
//   iris  — opens as a growing circle from the centre
//   drop  — falls from the top and bounces
//   fade  — plain quick fade
export type Enter = "punch" | "whip" | "iris" | "drop" | "fade";

const OUT = 4;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const Scene: React.FC<{
  children: React.ReactNode;
  enter?: Enter;
  dir?: 1 | -1;
  // White flash on entry, for the big beats.
  flash?: boolean;
  // Frame at which to shake the frame (e.g. when a ✕ lands).
  shakeAt?: number;
}> = ({ children, enter = "punch", dir = 1, flash, shakeAt }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps, width } = useVideoConfig();

  const out = interpolate(
    frame,
    [durationInFrames - OUT, durationInFrames],
    [1, 0],
    clamp,
  );
  const t = interpolate(frame, [0, 7], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  let opacity = out;
  let transform = "";
  let filter: string | undefined;
  let clipPath: string | undefined;

  switch (enter) {
    case "punch":
      opacity *= interpolate(frame, [0, 4], [0, 1], clamp);
      transform = `scale(${1.12 - 0.12 * t})`;
      break;
    case "whip":
      transform = `translateX(${(1 - t) * width * 0.6 * dir}px)`;
      filter = t < 1 ? `blur(${(1 - t) * 24}px)` : undefined;
      break;
    case "iris":
      clipPath = `circle(${t * 75}% at 50% 50%)`;
      break;
    case "drop": {
      const s = spring({ frame, fps, config: { damping: 11, stiffness: 200 } });
      transform = `translateY(${(1 - s) * -700}px)`;
      break;
    }
    case "fade":
      opacity *= interpolate(frame, [0, 6], [0, 1], clamp);
      break;
  }

  // Slow push so no scene ever sits perfectly still.
  const push = interpolate(frame, [0, durationInFrames], [1, 1.06]);
  const shakeT = shakeAt === undefined ? -1 : frame - shakeAt;
  const shake =
    shakeT >= 0 && shakeT < 10
      ? Math.sin(shakeT * 2.6) * 14 * (1 - shakeT / 10)
      : 0;
  const flashOpacity = flash
    ? interpolate(frame, [0, 2, 8], [0, 0.55, 0], clamp)
    : 0;

  return (
    <AbsoluteFill style={{ opacity, filter, clipPath }}>
      <AbsoluteFill
        style={{
          transform: `${transform} translateX(${shake}px) scale(${push})`,
          justifyContent: "center",
          alignItems: "center",
          padding: 120,
        }}
      >
        {children}
      </AbsoluteFill>
      {flashOpacity > 0 && (
        <AbsoluteFill style={{ background: "#fff", opacity: flashOpacity }} />
      )}
    </AbsoluteFill>
  );
};
