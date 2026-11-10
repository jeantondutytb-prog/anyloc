import Image from "next/image";

/**
 * App and device marks for the quiz, as iOS-style tiles. The images are the
 * owner's own (public/quiz-apps, 192 px max): the app icons are shown as they
 * are, the bare glyphs (Apple, Android) and the Google Maps pin sit centred on
 * a white tile.
 */

type TileProps = { size?: number };

const SRC = {
  snap: "/quiz-apps/snap.png",
  instagram: "/quiz-apps/instagram.png",
  life360: "/quiz-apps/life360.png",
  findmy: "/quiz-apps/findmy.png",
  gmaps: "/quiz-apps/google-maps.png",
  apple: "/quiz-apps/apple.png",
  android: "/quiz-apps/android.png",
} as const;

/** A full app icon: the picture is the whole tile (clipped to the tile's rounded shape). */
function AppIcon({ src, size = 44, scale = 1 }: { src: string; size?: number; scale?: number }) {
  return (
    <span
      className="relative flex shrink-0 overflow-hidden rounded-[28%] shadow-sm"
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        className="h-full w-full object-cover"
        style={scale === 1 ? undefined : { transform: `scale(${scale})` }}
      />
    </span>
  );
}

/** A bare glyph centred on a white tile with a light border, like the neutral tiles. */
function GlyphOnWhite({
  src,
  width,
  height,
  size = 44,
  ratio,
}: {
  src: string;
  /** Intrinsic size of the PNG, so the ratio is kept without layout shift. */
  width: number;
  height: number;
  size?: number;
  /** Share of the tile the glyph's tallest side fills. */
  ratio: number;
}) {
  const box = Math.round(size * ratio);
  const scale = box / Math.max(width, height);
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-[28%] border border-zinc-200 bg-white shadow-sm"
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt=""
        width={Math.round(width * scale)}
        height={Math.round(height * scale)}
      />
    </span>
  );
}

export function SnapLogo({ size }: TileProps) {
  return <AppIcon src={SRC.snap} size={size} />;
}

export function InstagramLogo({ size }: TileProps) {
  return <AppIcon src={SRC.instagram} size={size} />;
}

export function Life360Logo({ size }: TileProps) {
  return <AppIcon src={SRC.life360} size={size} />;
}

/** The PNG has its own rounded square with a few pixels of margin: a slight scale-up matches the others. */
export function FindMyLogo({ size }: TileProps) {
  return <AppIcon src={SRC.findmy} size={size} scale={1.06} />;
}

/** The PNG is the bare coloured pin (about 65 % of its height): it sits on a white tile. */
export function GoogleMapsLogo({ size = 44 }: TileProps) {
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-[28%] border border-zinc-200 bg-white shadow-sm"
      style={{ width: size, height: size }}
    >
      <Image src={SRC.gmaps} alt="" width={size} height={size} />
    </span>
  );
}

export function AppleLogo({ size }: TileProps) {
  return <GlyphOnWhite src={SRC.apple} width={156} height={192} size={size} ratio={0.6} />;
}

export function AndroidLogo({ size }: TileProps) {
  return <GlyphOnWhite src={SRC.android} width={163} height={192} size={size} ratio={0.6} />;
}
