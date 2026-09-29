import { loadFont } from "@remotion/google-fonts/Geist";

const { fontFamily } = loadFont("normal", {
  weights: ["500", "700", "800"],
  subsets: ["latin"],
});

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

// Same palette as the landing (`.gradient-text` in src/app/globals.css).
export const theme = {
  font: fontFamily,
  bg: "#0b0a12",
  text: "#fafafa",
  muted: "#a1a1aa",
  pink: "#f472b6",
  violet: "#a855f7",
  red: "#f43f5e",
  gradient:
    "linear-gradient(135deg, #fb7185 0%, #f472b6 35%, #c084fc 70%, #a855f7 100%)",
};

export const sec = (s: number) => Math.round(s * FPS);
