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
  };
}

export interface SitesGeoJSON {
  type: "FeatureCollection";
  features: SiteFeature[];
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
}

export interface AccessibilityRow {
  zip: string;
  dimension: string;
  gap: number;
  nearest_km: number;
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
