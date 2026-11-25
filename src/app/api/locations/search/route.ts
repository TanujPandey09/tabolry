import { NextResponse } from "next/server";

export interface LocationSuggestion {
  id: string;
  city: string;
  state: string;
  country: string;
  currency: string;
}

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  IN: "INR",
  US: "USD",
  GB: "GBP",
  AE: "AED",
  SA: "SAR",
  CA: "CAD",
  AU: "AUD",
  SG: "SGD",
  JP: "JPY",
  CH: "CHF",
  DE: "EUR",
  FR: "EUR",
  IT: "EUR",
  ES: "EUR",
  NL: "EUR",
  PT: "EUR",
  IE: "EUR",
  BE: "EUR",
  AT: "EUR",
};

interface PhotonFeature {
  properties?: {
    osm_id?: number;
    name?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    countrycode?: string;
    type?: string;
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() || "";

  if (query.length < 2 || query.length > 80) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=8&lang=en`,
      {
        signal: controller.signal,
        headers: { Accept: "application/json" },
        next: { revalidate: 86400 },
      }
    );
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ suggestions: [] });
    }

    const data = (await res.json()) as { features?: PhotonFeature[] };
    const seen = new Set<string>();
    const suggestions: LocationSuggestion[] = [];

    for (const feature of data.features || []) {
      const p = feature.properties;
      if (!p) continue;

      const city = (p.city || p.name || "").trim();
      const state = (p.state || p.county || "").trim();
      const country = (p.country || "").trim();
      if (!city || !country) continue;

      const dedupeKey = `${city.toLowerCase()}|${state.toLowerCase()}|${country.toLowerCase()}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const cc = (p.countrycode || "").toUpperCase();
      suggestions.push({
        id: String(p.osm_id || dedupeKey),
        city,
        state,
        country,
        currency: COUNTRY_CURRENCY_MAP[cc] || "USD",
      });

      if (suggestions.length >= 6) break;
    }

    return NextResponse.json(
      { suggestions },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
        },
      }
    );
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
