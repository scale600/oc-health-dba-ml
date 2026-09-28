import { lazy, Suspense, useMemo, useState } from "react";
import { useData } from "./hooks/useData";
import { hubSummary, toTitleCase } from "./utils";
import type { SitesGeoJSON } from "./types";

const MapView = lazy(() => import("./components/MapView"));
const ClusterView = lazy(() => import("./components/ClusterView"));
const AccessibilityView = lazy(() => import("./components/AccessibilityView"));
const InsightsView = lazy(() => import("./components/InsightsView"));

type Tab = "map" | "clusters" | "accessibility" | "insights";

const TAB_LABELS: Record<Tab, string> = {
  map: "Map",
  clusters: "Clusters",
  accessibility: "Accessibility",
  insights: "Insights",
};

interface Filters {
  city: string;
  planType: string;
  telehealth: string;
  search: string;
  hub: string;
  showIsolated: boolean;
}

const ALL = "all";

function filterSites(sites: SitesGeoJSON | null, f: Filters): SitesGeoJSON | null {
  if (!sites) return null;
  const features = sites.features.filter((feat) => {
    const p = feat.properties;
    if (f.city !== ALL && p.city !== f.city) return false;
    if (f.planType !== ALL && p.plan_type !== f.planType) return false;
    if (f.telehealth !== ALL && p.telehealth !== f.telehealth) return false;
    if (f.hub !== ALL && (p.cluster == null || String(p.cluster) !== f.hub)) return false;
    if (!f.showIsolated && p.is_noise === 1) return false;
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
    hub: ALL,
    showIsolated: true,
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

      <details className="glossary">
        <summary>About this data</summary>
        <div className="glossary-body">
          <p>
            <strong>Behavioral health</strong> is care for mental health conditions (therapy,
            counseling, psychiatric care) and substance use disorders (addiction treatment).
          </p>
          <p>
            <strong>Plan type</strong> is the Medi-Cal delivery system a site belongs to:
          </p>
          <ul>
            <li>
              <strong>MHP — Mental Health Plan</strong>: county-run specialty mental health
              services.
            </li>
            <li>
              <strong>DMC — Drug Medi-Cal</strong>: substance use disorder (SUD) treatment
              services.
            </li>
          </ul>
          <p>
            <strong>Telehealth</strong> means receiving care remotely (phone or video) rather than
            in person:
          </p>
          <ul>
            <li>
              <strong>B — Both</strong>: offers both in-person and remote visits.
            </li>
            <li>
              <strong>N — None</strong>: in-person visits only.
            </li>
          </ul>
          <p>
            <strong>Service hubs</strong> are groups of nearby sites (16 hubs).{" "}
            <strong>Archetypes</strong> are groups of providers with similar characteristics (4
            archetypes). <strong>Gap ZIPs</strong> are ZIP codes where the nearest site is 10 km or
            farther (3 gaps).
          </p>
        </div>
      </details>

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
            <option value="MHP">MHP — Mental Health Plan</option>
            <option value="DMC">DMC — Drug Medi-Cal</option>
          </select>
        </label>
        <label className="filter-group">
          <span className="filter-label">Telehealth</span>
          <select
            value={filters.telehealth}
            onChange={(e) => setFilters({ ...filters, telehealth: e.target.value })}
          >
            <option value={ALL}>All</option>
            <option value="B">B — Both (in-person + telehealth)</option>
            <option value="N">N — In-person only</option>
          </select>
        </label>
        <label className="filter-group">
          <span className="filter-label">Hub</span>
          <select
            value={filters.hub}
            onChange={(e) => setFilters({ ...filters, hub: e.target.value })}
          >
            <option value={ALL}>All hubs</option>
            {hubLegend.map((h) => (
              <option key={h.hub} value={String(h.hub)}>
                Hub {h.hub} — {h.city}
              </option>
            ))}
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
        <label className="filter-check">
          <input
            type="checkbox"
            checked={filters.showIsolated}
            onChange={(e) => setFilters({ ...filters, showIsolated: e.target.checked })}
          />
          <span>Show isolated sites</span>
        </label>
        <span className="filter-count">
          Showing {showing} of {kpis.sites} sites
        </span>
      </section>

      {showing === 0 && (
        <div className="empty">No sites match your filters. Try clearing one or more filters.</div>
      )}

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
        <Suspense fallback={<div className="skeleton skeleton-content" />}>
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
          {tab === "insights" && data.sites && (
            <InsightsView
              cityStats={data.cityStats}
              clusters={data.clusters}
              sites={data.sites}
              accessibility={data.accessibility}
            />
          )}
        </Suspense>
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
