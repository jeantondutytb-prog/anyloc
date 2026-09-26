import QRCode from "qrcode";
import { SITE_URL } from "@/lib/seo";

// Fixed-target QR code (no user input) shown by the desktop app so the
// customer can open the iPhone remote by scanning with the Camera app.
export async function GET() {
  const svg = await QRCode.toString(`${SITE_URL.replace(/\/$/, "")}/app`, {
    type: "svg",
    margin: 1,
    color: { dark: "#18181b", light: "#ffffff" },
  });

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
