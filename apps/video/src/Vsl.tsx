import {
  AbsoluteFill,
  Html5Audio,
  Img,
  interpolate,
  Series,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background } from "./components/Background";
import { Cross } from "./components/Cross";
import { KineticText, type TextVariant } from "./components/KineticText";
import { MapPins } from "./components/MapPins";
import { Phone } from "./components/Phone";
import { Scene, type Enter } from "./components/Scene";
import { sec, theme } from "./theme";
import voice from "../assets/voice.mp3";

// Keep in sync with CHECKOUT_CTA_LABEL / SITE.domain in src/lib/constants.ts.
const CTA_LABEL = "Débloque ton accès";
const DOMAIN = "anyloc.io";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Brings a phone (or anything) in — each scene uses a different entrance.
const Arrive: React.FC<{
  children: React.ReactNode;
  from: "bottom" | "left" | "right" | "spin";
  delay?: number;
}> = ({ children, from, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: frame - delay,
    fps,
    config: { damping: 14, stiffness: 240 },
  });
  const k = 1 - s;
  const transform = {
    bottom: `translateY(${k * 300}px)`,
    left: `translateX(${k * -700}px) rotate(${k * -12}deg)`,
    right: `translateX(${k * 700}px) rotate(${k * 12}deg)`,
    spin: `scale(${0.3 + 0.7 * s}) rotate(${k * -200}deg)`,
  }[from];
  return (
    <div style={{ transform, opacity: Math.min(1, s * 2) }}>{children}</div>
  );
};

const Row: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 110,
      width: "100%",
    }}
  >
    {children}
  </div>
);

const FakeSolution: React.FC<{
  text: string;
  variant: TextVariant;
  enter: Enter;
  dir?: 1 | -1;
  // Where the ✕ stamp sits relative to the text.
  cross: "left" | "right" | "top";
  // Makes the text flicker out at the end ("t'existes plus").
  vanish?: boolean;
  // Seconds into the scene when the voice says the punchline — the ✕ lands then.
  stampAt: number;
}> = ({ text, variant, enter, dir, cross, vanish, stampAt }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const at = sec(stampAt);
  const fadeStart = durationInFrames - sec(0.9);
  const flicker =
    vanish && frame > fadeStart
      ? interpolate(frame, [fadeStart, durationInFrames - 6], [1, 0.08], clamp) *
        (frame % 4 < 2 ? 1 : 0.55)
      : 1;

  const words = (
    <div style={{ maxWidth: 1150, opacity: flicker }}>
      <KineticText
        text={text}
        size={84}
        align={cross === "top" ? "center" : "left"}
        variant={variant}
      />
    </div>
  );

  return (
    <Scene enter={enter} dir={dir} shakeAt={at + 3}>
      {cross === "top" ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 50,
          }}
        >
          <Cross at={at} />
          {words}
        </div>
      ) : (
        <Row>
          {cross === "left" && <Cross at={at} />}
          {words}
          {cross === "right" && <Cross at={at} />}
        </Row>
      )}
    </Scene>
  );
};

const Badge: React.FC<{ label: string; at: number; tilt: number }> = ({
  label,
  at,
  tilt,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: frame - at,
    fps,
    config: { damping: 8, stiffness: 260 },
  });
  return (
    <div
      style={{
        transform: `translateY(${(1 - s) * -500}px) rotate(${(1 - s) * tilt}deg)`,
        opacity: Math.min(1, s * 3),
        padding: "26px 52px",
        borderRadius: 99,
        fontFamily: theme.font,
        fontWeight: 700,
        fontSize: 52,
        color: theme.text,
        background: "rgba(255,255,255,0.06)",
        border: "2px solid rgba(244,114,182,0.45)",
      }}
    >
      {label}
    </div>
  );
};

// Scene 3: the camera slowly zooms onto your lonely pin.
const ZoomIn: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const z = interpolate(frame, [sec(0.6), durationInFrames], [1, 1.35], clamp);
  return <div style={{ transform: `scale(${z})` }}>{children}</div>;
};

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = spring({ frame, fps, config: { damping: 10, stiffness: 260 } });
  const cta = spring({
    frame: frame - sec(0.95),
    fps,
    config: { damping: 11, stiffness: 260 },
  });
  // The button breathes once it has landed, to pull the eye.
  const pulse = frame > 40 ? 1 + Math.sin((frame - 40) / 5) * 0.035 : 1;
  return (
    <Scene enter="punch">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 40,
          fontFamily: theme.font,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <Img
            src={staticFile("logo.png")}
            style={{
              width: 150,
              height: 150,
              borderRadius: 36,
              transform: `scale(${logo}) rotate(${(1 - logo) * -180}deg)`,
            }}
          />
          <span
            style={{
              fontSize: 150,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              color: theme.text,
              transform: `translateX(${(1 - logo) * 120}px)`,
              opacity: logo,
            }}
          >
            Anyloc
          </span>
        </div>
        <div
          style={{
            transform: `translateY(${(1 - cta) * 60}px)`,
            opacity: cta,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 26,
          }}
        >
          <div
            style={{
              padding: "30px 70px",
              borderRadius: 99,
              background: theme.gradient,
              color: "#fff",
              fontSize: 56,
              fontWeight: 800,
              transform: `scale(${pulse})`,
              boxShadow: "0 30px 70px -20px rgba(236,72,153,0.7)",
            }}
          >
            {CTA_LABEL} →
          </div>
          <span style={{ fontSize: 40, fontWeight: 500, color: theme.muted }}>
            {DOMAIN}
          </span>
        </div>
      </div>
    </Scene>
  );
};

const Column: React.FC<{ children: React.ReactNode; gap?: number }> = ({
  children,
  gap = 60,
}) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap,
    }}
  >
    {children}
  </div>
);

// When each scene starts, in seconds, cut in the pauses of the voiceover
// (assets/voice.mp3, 33.2 s). Re-time these if the voice is re-generated:
// `ffmpeg -i assets/voice.mp3 -af silencedetect=noise=-35dB:d=0.15 -f null -`
const CUES = [
  0, // Ouvre ta Snap Map.
  1.24, // Tout le monde est à Marbella, Mykonos, Dubaï.
  4.62, // Et toi ? Même quartier. Même bloc.
  7.33, // Un VPN ? Il change ton IP, pas ton GPS.
  10.63, // Le mode fantôme ? T'existes plus.
  12.67, // Les applis Fake GPS ? Une appli à la fois… et ça saute au reboot.
  16.78, // Anyloc hack ton GPS, à la source.
  19.56, // Snap, Insta, Tinder, tes jeux : tout ton tel déménage.
  23.37, // Tu choisis ta ville. Un tap.
  25.16, // Ça marche sur iPhone, sur Android, zéro jailbreak.
  28.1, // Ce soir… t'es à Dubaï.
  29.91, // Anyloc. Débloque ton accès sur anyloc point io.
];
export const VSL_END = 33.8;

// Frame lengths from cue to cue, so rounding never drifts from the voice.
const SCENE_FRAMES = [...CUES, VSL_END].slice(1).map((t, i) => sec(t) - sec(CUES[i]));

// Each scene deliberately mixes a different entrance and text animation
// from its neighbours, so the video never repeats the same move twice in a row.
export const Vsl: React.FC = () => {
  const d = SCENE_FRAMES;

  return (
    <AbsoluteFill>
      <Html5Audio src={voice} />
      <Background />
      <Series>
        {/* 1 — hook: words slam onto the screen */}
        <Series.Sequence durationInFrames={d[0]}>
          <Scene enter="fade">
            <KineticText text="Ouvre ta *Snap* *Map.*" size={150} variant="slam" />
          </Scene>
        </Series.Sequence>

        {/* 2 — everyone else is travelling: typed out, whip in */}
        <Series.Sequence durationInFrames={d[1]}>
          <Scene enter="whip">
            <Column>
              <KineticText
                text="Tout le monde est à *Marbella.* *Mykonos.* *Dubaï.*"
                size={76}
                variant="type"
                stagger={1.5}
              />
              <MapPins
                pins={[
                  { label: "Marbella", x: 18, y: 58, at: sec(1.1) },
                  { label: "Mykonos", x: 52, y: 38, at: sec(1.8) },
                  { label: "Dubaï", x: 82, y: 64, at: sec(2.5) },
                ]}
              />
            </Column>
          </Scene>
        </Series.Sequence>

        {/* 3 — and you: iris open, lines rise, camera zooms on your pin */}
        <Series.Sequence durationInFrames={d[2]}>
          <Scene enter="iris">
            <Column>
              <KineticText
                text="Et toi ? Même quartier. *Même* *bloc.*"
                size={76}
                variant="rise"
              />
              <ZoomIn>
                <MapPins
                  pins={[
                    {
                      label: "Toi · en bas de chez toi",
                      x: 50,
                      y: 62,
                      at: sec(0.5),
                      dim: true,
                    },
                  ]}
                />
              </ZoomIn>
            </Column>
          </Scene>
        </Series.Sequence>

        {/* 4-6 — fake solutions, each staged differently */}
        <Series.Sequence durationInFrames={d[3]}>
          <FakeSolution
            text="Un VPN ? Il change ton IP. | *Pas* *ton* *GPS.*"
            variant="pop"
            enter="whip"
            dir={-1}
            cross="left"
            stampAt={2.2}
          />
        </Series.Sequence>
        <Series.Sequence durationInFrames={d[4]}>
          <FakeSolution
            text="Le mode fantôme ? | *T'existes* *plus.*"
            variant="wave"
            enter="drop"
            cross="right"
            vanish
            stampAt={1.1}
          />
        </Series.Sequence>
        <Series.Sequence durationInFrames={d[5]}>
          <FakeSolution
            text="Les apps « Fake GPS » ? Une app à la fois. | *Ça* *saute* *au* *reboot.*"
            variant="rise"
            enter="punch"
            cross="top"
            stampAt={2.8}
          />
        </Series.Sequence>

        {/* 7 — the reveal: flash, iris, phone spins in, letters cascade */}
        <Series.Sequence durationInFrames={d[6]}>
          <Scene enter="iris" flash>
            <Row>
              <Arrive from="spin">
                <Phone screens={["proof/sys-paris.png"]} height={780} />
              </Arrive>
              <div style={{ maxWidth: 900 }}>
                <KineticText
                  text="*Anyloc* hack | ton GPS | à la source."
                  size={100}
                  align="left"
                  variant="wave"
                  delay={sec(0.15)}
                />
              </div>
            </Row>
          </Scene>
        </Series.Sequence>

        {/* 8 — every app follows: phone slides from the right, screens swipe */}
        <Series.Sequence durationInFrames={d[7]}>
          <Scene enter="whip">
            <Row>
              <div style={{ maxWidth: 900 }}>
                <KineticText
                  text="Snap, Insta, Tinder, tes jeux : | *tout* *ton* *tel* *déménage.*"
                  size={84}
                  align="left"
                  variant="pop"
                />
              </div>
              <Arrive from="right">
                <Phone
                  screens={[
                    "proof/snap-dubai.png",
                    "proof/snap-miami.png",
                    "proof/snap-new-york.png",
                  ]}
                  hold={sec(1.1)}
                  height={780}
                />
              </Arrive>
            </Row>
          </Scene>
        </Series.Sequence>

        {/* 9 — pick a city: scene drops in, phone from the left with taps */}
        <Series.Sequence durationInFrames={d[8]}>
          <Scene enter="drop">
            <Row>
              <Arrive from="left">
                <Phone
                  screens={[
                    "proof/sys-tokyo.png",
                    "proof/sys-rio.png",
                    "proof/sys-paris.png",
                  ]}
                  hold={sec(0.6)}
                  height={780}
                  taps
                />
              </Arrive>
              <div style={{ maxWidth: 900 }}>
                <KineticText
                  text="Tu choisis | ta ville. | *1* *tap.*"
                  size={110}
                  align="left"
                  variant="pop"
                />
              </div>
            </Row>
          </Scene>
        </Series.Sequence>

        {/* 10 — reassurance: badges fall from the top */}
        <Series.Sequence durationInFrames={d[9]}>
          <Scene enter="fade">
            <Column gap={70}>
              <KineticText text="Marche sur *ton* *tel.*" size={110} variant="rise" />
              <div style={{ display: "flex", gap: 36 }}>
                <Badge label="iPhone" at={sec(0.8)} tilt={-25} />
                <Badge label="Android" at={sec(1.4)} tilt={18} />
                <Badge label="Zéro jailbreak" at={sec(2)} tilt={-12} />
              </div>
            </Column>
          </Scene>
        </Series.Sequence>

        {/* 11 — the payoff: flash, slam, phone rises */}
        <Series.Sequence durationInFrames={d[10]}>
          <Scene enter="punch" flash>
            <Row>
              <div style={{ maxWidth: 900 }}>
                <KineticText
                  text="Ce soir, | t'es à *Dubaï.*"
                  size={140}
                  align="left"
                  variant="slam"
                />
              </div>
              <Arrive from="bottom">
                <Phone screens={["proof/snap-dubai.png"]} height={820} />
              </Arrive>
            </Row>
          </Scene>
        </Series.Sequence>

        {/* 12 — CTA */}
        <Series.Sequence durationInFrames={d[11]}>
          <EndCard />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
