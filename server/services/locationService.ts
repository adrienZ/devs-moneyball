import { $fetch } from "ofetch";

export interface LocationSuggestion {
  name: string;
  country: string;
  city?: string;
  state?: string;
  lat: number;
  lon: number;
  label: string;
}
export async function searchLocations(query: string): Promise<LocationSuggestion[]> {
  if (!query || query.length < 2) return [];
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`;
  const res = await $fetch<{ features: Array<{ properties: Record<string, unknown>; geometry: { coordinates: [number, number] } }> }>(url);
  if (!res?.features?.length) return [];
  return res.features.map(({ properties, geometry }) => {
    const name = typeof properties.name === "string" ? properties.name : "";
    const country = typeof properties.country === "string" ? properties.country : "";
    const city = typeof properties.city === "string" ? properties.city : undefined;
    const state = typeof properties.state === "string" ? properties.state : undefined;
    const lat = geometry.coordinates[1];
    const lon = geometry.coordinates[0];
    const label = [name, city, state, country].filter(Boolean).join(", ");
    return { name, country, city, state, lat, lon, label };
  });
}
