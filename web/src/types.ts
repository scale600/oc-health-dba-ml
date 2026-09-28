export interface SiteFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    site_id: number;
    name: string;
    city: string;
    zip: string;
    plan_type: string | null;
    telehealth: string | null;
    cluster: number | null;
    is_noise: number;
    provider_count: number;
  };
}

export interface SitesGeoJSON {
  type: "FeatureCollection";
  features: SiteFeature[];
}

export interface CityFeature {
  type: "Feature";
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: unknown };
  properties: {
    name: string;
    type: "city" | "CDP";
    site_count: number;
  };
}

export interface CitiesGeoJSON {
  type: "FeatureCollection";
  features: CityFeature[];
}

export interface HubLegendEntry {
  hub: number;
  city: string;
  count: number;
}

export interface Provider {
  provider_id: number;
  first_name: string | null;
  last_name: string | null;
  gender: string | null;
  archetype: number | null;
}

export interface Cluster {
  archetype: number;
  member_count: number;
  dominant_specialty: string | null;
  dominant_specialty_count: number;
  dominant_language: string | null;
  dominant_language_count: number;
}

export interface AccessibilityRow {
  zip: string;
  dimension: string;
  gap: number;
  nearest_km: number;
  latitude: number;
  longitude: number;
}

export interface CityStat {
  city: string;
  site_count: number;
  provider_count: number;
}

export interface LookupItem {
  code: string;
  description: string;
}

export interface Lookups {
  languages: LookupItem[];
  service_types: LookupItem[];
  specialties: LookupItem[];
}
