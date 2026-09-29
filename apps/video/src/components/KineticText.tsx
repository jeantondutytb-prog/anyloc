import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme } from "../theme";

// How the words arrive — each scene picks a different one so the video
// doesn't repeat the same move over and over.
//   pop   — words punch in, slightly oversized and blurred
//   rise  — each line is revealed from behind a mask, sliding up
//   slam  — words drop from huge onto the screen, heavy and fast
//   type  — typewriter, letter by letter, with a caret
//   wave  — letters cascade in with a small rotation
export type TextVariant = "pop" | "rise" | "slam" | "type" | "wave";

type Props = {
  // Words wrapped in *asterisks* get the gradient + underline sweep.
  // A "|" forces a line break.
  text: string;
  size?: number;
  // Frames between two words (or letters for type/wave) appearing.
  stagger?: number;
  delay?: number;
  align?: "center" | "left";
  variant?: TextVariant;
};

type Word = { word: string; hot: boolean };
type Token = Word | "break";

const tokenize = (text: string): Token[] =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) =>
      raw === "|"
        ? "break"
        : { word: raw.replace(/\*/g, ""), hot: raw.includes("*") },
    );

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const gradientText = {
  backgroundImage: theme.gradient,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
} as const;

const DEFAULT_STAGGER: Record<TextVariant, number> = {
  pop: 2,
  rise: 3,
  slam: 5,
  type: 1,
  wave: 1,
};

export const KineticText: React.FC<Props> = ({
  text,
  size = 96,
  stagger,
  delay = 0,
  align = "center",
  variant = "pop",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const step = stagger ?? DEFAULT_STAGGER[variant];

  const lines: Word[][] = [[]];
  for (const t of tokenize(text)) {
    if (t === "break") lines.push([]);
    else lines[lines.length - 1].push(t);
  }

  // Letter-based variants count letters, word-based ones count words.
  const perLetter = variant === "type" || variant === "wave";
  let cursor = 0;
  const totalUnits = lines
    .flat()
    .reduce((n, w) => n + (perLetter ? w.word.length + 1 : 1), 0);
  const typed = (frame - delay) / step;

  const renderWord = (w: Word, li: number, wi: number) => {
    const start = delay + cursor * step;
    const underline = interpolate(frame - start - 3, [0, 6], [0, 1], clamp);
    const underlineBar = w.hot && (
      <span
        style={{
          position: "absolute",
          left: 0,
          bottom: -size * 0.06,
          height: Math.max(4, size * 0.06),
          width: `${underline * 100}%`,
          borderRadius: 99,
          backgroundImage: theme.gradient,
        }}
      />
    );

    if (perLetter) {
      const letters = [...w.word].map((ch, ci) => {
        const i = cursor + ci;
        if (variant === "type") {
          return (
            <span key={ci} style={{ opacity: typed > i ? 1 : 0 }}>
              {ch}
            </span>
          );
        }
        const s = spring({
          frame: frame - (delay + i * step),
          fps,
          config: { damping: 11, stiffness: 300, mass: 0.4 },
        });
        return (
          <span
            key={ci}
            style={{
              display: "inline-block",
              opacity: Math.min(1, s * 1.4),
              transform: `translateY(${(1 - s) * size * 0.6}px) rotate(${(1 - s) * 18}deg)`,
              ...(w.hot && gradientText),
            }}
          >
            {ch}
          </span>
        );
      });
      cursor += w.word.length + 1;
      return (
        <span
          key={`${li}-${wi}`}
          style={{
            position: "relative",
            display: "inline-block",
            ...(w.hot && variant === "type" && gradientText),
          }}
        >
          {letters}
          {underlineBar}
        </span>
      );
    }

    cursor += 1;
    const enter = spring({
      frame: frame - start,
      fps,
      config:
        variant === "slam"
          ? { damping: 22, stiffness: 420, mass: 0.7 }
          : { damping: 12, stiffness: 320, mass: 0.5 },
    });

    const motion: React.CSSProperties =
      variant === "slam"
        ? {
            opacity: interpolate(enter, [0, 0.3], [0, 1], clamp),
            transform: `scale(${3.2 - 2.2 * enter})`,
          }
        : variant === "rise"
          ? { transform: `translateY(${(1 - enter) * 110}%)` }
          : {
              opacity: Math.min(1, enter * 1.5),
              transform: `translateY(${(1 - enter) * size * 0.25}px) scale(${1.35 - 0.35 * enter})`,
              filter: `blur(${Math.max(0, (1 - enter) * 8)}px)`,
            };

    const inner = (
      <span
        style={{
          position: "relative",
          display: "inline-block",
          ...motion,
          ...(w.hot && gradientText),
        }}
      >
        {w.word}
        {underlineBar}
      </span>
    );

    // "rise" clips each word so it appears to come out from under a line.
    return variant === "rise" ? (
      <span
        key={`${li}-${wi}`}
        style={{
          display: "inline-block",
          overflow: "hidden",
          paddingBottom: size * 0.12,
          marginBottom: -size * 0.12,
        }}
      >
        {inner}
      </span>
    ) : (
      <span key={`${li}-${wi}`}>{inner}</span>
    );
  };

  // Hidden letters still take up space, so the caret only shows (blinking)
  // once the whole line is typed — otherwise it would float past the text.
  const caretOn =
    variant === "type" && typed >= totalUnits && Math.floor(frame / 8) % 2;

  return (
    <div
      style={{
        fontFamily: theme.font,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.15,
        letterSpacing: "-0.03em",
        color: theme.text,
        textAlign: align,
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "flex-start",
        gap: size * 0.1,
      }}
    >
      {lines.map((line, li) => (
        <div
          key={li}
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "baseline",
            justifyContent: align === "center" ? "center" : "flex-start",
            columnGap: size * 0.26,
          }}
        >
          {line.map((w, wi) => renderWord(w, li, wi))}
          {variant === "type" && li === lines.length - 1 && (
            <span
              style={{
                display: "inline-block",
                width: size * 0.08,
                height: size * 0.9,
                marginLeft: -size * 0.18,
                alignSelf: "center",
                background: theme.pink,
                opacity: caretOn ? 1 : 0,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
};
