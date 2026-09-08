import { createMapKitToken, isMapKitConfigured } from "@/lib/mapkit-token";

export async function GET() {
  if (!isMapKitConfigured()) {
    return new Response("Apple MapKit non configuré.", { status: 503 });
  }

  try {
    const token = await createMapKitToken();
    return new Response(token, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "private, max-age=1800",
      },
    });
  } catch (error) {
    console.error("[mapkit/token] Failed to create token:", error);
    return new Response("Impossible de générer le token MapKit.", { status: 500 });
  }
}
