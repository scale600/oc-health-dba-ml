import type { HubLegendEntry, SitesGeoJSON } from "./types";

export function toTitleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function hubSummary(sites: SitesGeoJSON): HubLegendEntry[] {
  const byHub = new Map<number, { cities: Map<string, number>; count: number }>();
  for (const f of sites.features) {
    const c = f.properties.cluster;
    if (c == null) continue;
    const entry = byHub.get(c) ?? { cities: new Map<string, number>(), count: 0 };
    entry.count += 1;
    const city = f.properties.city || "Unknown";
    entry.cities.set(city, (entry.cities.get(city) ?? 0) + 1);
    byHub.set(c, entry);
  }
  return [...byHub.entries()]
    .map(([hub, e]) => {
      const top = [...e.cities.entries()].sort((a, b) => b[1] - a[1])[0];
      return { hub, city: toTitleCase(top ? top[0] : "Unknown"), count: e.count };
    })
    .sort((a, b) => a.hub - b.hub);
}
