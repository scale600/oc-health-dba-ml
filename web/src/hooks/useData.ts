import { useEffect, useState } from "react";
import type {
  AccessibilityRow,
  CitiesGeoJSON,
  CityStat,
  Cluster,
  Lookups,
  Provider,
  SitesGeoJSON,
} from "../types";

interface Data {
  sites: SitesGeoJSON | null;
  cities: CitiesGeoJSON | null;
  providers: Provider[];
  clusters: Cluster[];
  accessibility: AccessibilityRow[];
  lookups: Lookups | null;
  cityStats: CityStat[];
  loading: boolean;
  error: string | null;
}

const EMPTY: Data = {
  sites: null,
  cities: null,
  providers: [],
  clusters: [],
  accessibility: [],
  lookups: null,
  cityStats: [],
  loading: true,
  error: null,
};

export function useData(): Data {
  const [state, setState] = useState<Data>(EMPTY);

  useEffect(() => {
    Promise.all([
      fetch("/data/sites.geojson").then((r) => r.json()),
      fetch("/data/oc_cities.geojson").then((r) => r.json()),
      fetch("/data/providers.json").then((r) => r.json()),
      fetch("/data/clusters.json").then((r) => r.json()),
      fetch("/data/accessibility.json").then((r) => r.json()),
      fetch("/data/lookups.json").then((r) => r.json()),
      fetch("/data/city_stats.json").then((r) => r.json()),
    ])
      .then(([sites, cities, providers, clusters, accessibility, lookups, cityStats]) => {
        setState({
          sites,
          cities,
          providers,
          clusters,
          accessibility,
          lookups,
          cityStats,
          loading: false,
          error: null,
        });
      })
      .catch((err: unknown) => {
        setState({ ...EMPTY, loading: false, error: String(err) });
      });
  }, []);

  return state;
}
