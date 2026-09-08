import { parsePhotonResponse } from "@/lib/geocoding";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return Response.json({ results: [] });
  }

  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "8");
  url.searchParams.set("lang", "fr");
  url.searchParams.set("layer", "city");
  url.searchParams.append("layer", "locality");
  url.searchParams.append("layer", "district");
  url.searchParams.append("layer", "county");

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return Response.json(
        { error: "Service de recherche indisponible." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const results = parsePhotonResponse(data);

    if (results.length > 0) {
      return Response.json({ results });
    }

    const fallbackUrl = new URL("https://photon.komoot.io/api/");
    fallbackUrl.searchParams.set("q", query);
    fallbackUrl.searchParams.set("limit", "8");
    fallbackUrl.searchParams.set("lang", "fr");

    const fallbackResponse = await fetch(fallbackUrl, {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 300 },
    });

    if (!fallbackResponse.ok) {
      return Response.json(
        { error: "Service de recherche indisponible." },
        { status: 502 }
      );
    }

    const fallbackData = await fallbackResponse.json();

    return Response.json({ results: parsePhotonResponse(fallbackData) });
  } catch (error) {
    console.error("[geocode] Search failed:", error);
    return Response.json(
      { error: "Impossible de rechercher cette ville." },
      { status: 500 }
    );
  }
}
