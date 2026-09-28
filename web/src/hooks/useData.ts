import { useEffect, useState } from "react";
import type {
  AccessibilityRow,
  Cluster,
  Lookups,
  Provider,
  SitesGeoJSON,
} from "../types";

interface Data {
  sites: SitesGeoJSON | null;
  providers: Provider[];
  clusters: Cluster[];
  accessibility: AccessibilityRow[];
  lookups: Lookups | null;
  loading: boolean;
  error: string | null;
}

const EMPTY: Data = {
  sites: null,
  providers: [],
  clusters: [],
  accessibility: [],
  lookups: null,
  loading: true,
  error: null,
};

export function useData(): Data {
  const [state, setState] = useState<Data>(EMPTY);

  useEffect(() => {
    Promise.all([
      fetch("/data/sites.geojson").then((r) => r.json()),
      fetch("/data/providers.json").then((r) => r.json()),
      fetch("/data/clusters.json").then((r) => r.json()),
      fetch("/data/accessibility.json").then((r) => r.json()),
      fetch("/data/lookups.json").then((r) => r.json()),
    ])
      .then(([sites, providers, clusters, accessibility, lookups]) => {
        setState({
          sites,
          providers,
          clusters,
          accessibility,
          lookups,
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
