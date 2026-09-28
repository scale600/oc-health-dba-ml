import { useMemo, useState } from "react";
import { useData } from "./hooks/useData";
import MapView from "./components/MapView";
import ClusterView from "./components/ClusterView";
import AccessibilityView from "./components/AccessibilityView";
import { hubSummary, toTitleCase } from "./utils";
import type { SitesGeoJSON } from "./types";

type Tab = "map" | "clusters" | "accessibility";

const TAB_LABELS: Record<Tab, string> = {
  map: "Map",
  clusters: "Clusters",
  accessibility: "Accessibility",
};

interface Filters {
  city: string;
  planType: string;
  telehealth: string;
  search: string;
}

const ALL = "all";

function filterSites(sites: SitesGeoJSON | null, f: Filters): SitesGeoJSON | null {
  if (!sites) return null;
  const features = sites.features.filter((feat) => {
    const p = feat.properties;
    if (f.city !== ALL && p.city !== f.city) return false;
    if (f.planType !== ALL && p.plan_type !== f.planType) return false;
    if (f.telehealth !== ALL && p.telehealth !== f.telehealth) return false;
    if (f.search) {
      const q = f.search.toLowerCase();
      if (!(p.name ?? "").toLowerCase().includes(q)) return false;
    }
    return true;
  });
  return { type: "FeatureCollection", features };
}

export default function App() {
  const data = useData();
  const [tab, setTab] = useState<Tab>("map");
  const [filters, setFilters] = useState<Filters>({
    city: ALL,
    planType: ALL,
    telehealth: ALL,
    search: "",
  });

  const allSites = data.sites?.features ?? [];
  const cityOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of allSites) set.add(s.properties.city);
    return [...set].sort();
  }, [allSites]);

  const filteredSites = useMemo(
    () => filterSites(data.sites, filters),
    [data.sites, filters]
  );

  const kpis = useMemo(() => {
    const isolated = allSites.filter((s) => s.properties.is_noise === 1).length;
    const gapZips = data.accessibility.filter((a) => a.gap === 1).length;
    const activeClusters = new Set(
      allSites.map((s) => s.properties.cluster).filter((c): c is number => c !== null)
    ).size;
    return {
      providers: data.providers.length,
      sites: allSites.length,
      isolated,
      gapZips,
      activeClusters,
      archetypes: data.clusters.length,
    };
  }, [data, allSites]);

  const hubLegend = useMemo(
    () => (data.sites ? hubSummary(data.sites) : []),
    [data.sites]
  );
  const gapRows = useMemo(
    () => data.accessibility.filter((a) => a.gap === 1),
    [data.accessibility]
  );

  if (data.loading) return <Skeleton />;
  if (data.error) return <div className="error">Error loading data: {data.error}</div>;

  const showing = filteredSites?.features.length ?? 0;

  return (
    <div className="app">
      <header className="header">
        <h1>OC Medi-Cal Behavioral Health</h1>
        <p className="subtitle">Provider Clustering &amp; Accessibility Analysis</p>
        <p className="description">
          This dashboard maps 1,851 behavioral health providers across 147 Orange County service
          sites, grouping them into 16 geographic service hubs and 4 workforce archetypes — and
          flags 3 ZIP codes with limited access (≥10 km to the nearest site). Source: OC Health
          Care Agency Behavioral Health Plan provider directory (public API).
        </p>
      </header>

      <section className="kpi-row">
        <div className="kpi">
          <span className="kpi-value">{kpis.providers.toLocaleString()}</span>
          <span className="kpi-label">Providers</span>
          <span className="kpi-sub">across {kpis.archetypes} archetypes</span>
        </div>
        <div className="kpi">
          <span className="kpi-value">{kpis.sites}</span>
          <span className="kpi-label">Sites</span>
          <span className="kpi-sub">100% geocoded</span>
        </div>
        <div className="kpi">
          <span className="kpi-value">{kpis.activeClusters}</span>
          <span className="kpi-label">Service hubs</span>
          <span className="kpi-sub">{kpis.isolated} isolated sites</span>
        </div>
        <div className="kpi">
          <span className="kpi-value">{kpis.isolated}</span>
          <span className="kpi-label">Isolated sites</span>
          <span className="kpi-sub">not in any hub</span>
        </div>
        <div className="kpi">
          <span className="kpi-value">{kpis.gapZips}</span>
          <span className="kpi-label">Gap ZIPs</span>
          <span className="kpi-sub">≥10 km to nearest</span>
        </div>
      </section>

      <section className="filters">
        <label className="filter-group">
          <span className="filter-label">City</span>
          <select
            value={filters.city}
            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
          >
            <option value={ALL}>All cities</option>
            {cityOptions.map((c) => (
              <option key={c} value={c}>
                {toTitleCase(c)}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-group">
          <span className="filter-label">Plan type</span>
          <select
            value={filters.planType}
            onChange={(e) => setFilters({ ...filters, planType: e.target.value })}
          >
            <option value={ALL}>All</option>
            <option value="MHP">MHP</option>
            <option value="DMC">DMC</option>
          </select>
        </label>
        <label className="filter-group">
          <span className="filter-label">Telehealth</span>
          <select
            value={filters.telehealth}
            onChange={(e) => setFilters({ ...filters, telehealth: e.target.value })}
          >
            <option value={ALL}>All</option>
            <option value="B">Both</option>
            <option value="N">None</option>
          </select>
        </label>
        <label className="filter-group grow">
          <span className="filter-label">Search</span>
          <input
            type="text"
            placeholder="Site name…"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </label>
        <span className="filter-count">
          Showing {showing} of {kpis.sites} sites
        </span>
      </section>

      <nav className="tabs">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button
            key={t}
            className={tab === t ? "tab active" : "tab"}
            onClick={() => setTab(t)}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </nav>

      <main className="content">
        {tab === "map" && data.sites && data.cities && (
          <MapView
            sites={filteredSites ?? data.sites}
            cities={data.cities}
            gaps={gapRows}
            hubLegend={hubLegend}
          />
        )}
        {tab === "clusters" && (
          <ClusterView clusters={data.clusters} providers={data.providers} />
        )}
        {tab === "accessibility" && <AccessibilityView rows={data.accessibility} />}
      </main>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="app">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-subtitle" />
      <div className="kpi-row">
        {Array.from({ length: 5 }).map((_, i) => (
          <div className="kpi" key={i}>
            <div className="skeleton skeleton-kpi" />
          </div>
        ))}
      </div>
      <div className="skeleton skeleton-tabs" />
      <div className="skeleton skeleton-content" />
    </div>
  );
}
