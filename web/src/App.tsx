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
        <div className="header-links">
          <a
            className="icon-link"
            href="https://project.techcloudup.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Project site"
            title="Project site"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M7.5 5.25a3 3 0 0 1 3-3h3a3 3 0 0 1 3 3v.205c.933.085 1.857.197 2.774.334 1.454.218 2.476 1.483 2.476 2.917v3.033c0 1.211-.734 2.352-1.936 2.752A24.726 24.726 0 0 1 12 15.75c-2.73 0-5.357-.442-7.814-1.259-1.202-.4-1.936-1.541-1.936-2.752V8.706c0-1.434 1.022-2.7 2.476-2.917A48.814 48.814 0 0 1 7.5 5.455V5.25Zm7.5 0v.09a49.488 49.488 0 0 0-6 0v-.09a1.5 1.5 0 0 1 1.5-1.5h3a1.5 1.5 0 0 1 1.5 1.5Zm-3 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
                clipRule="evenodd"
              />
              <path d="M3 18.4v-2.796a4.3 4.3 0 0 0 .713.31A26.226 26.226 0 0 0 12 17.25c2.892 0 5.68-.468 8.287-1.335.252-.084.49-.189.713-.311V18.4c0 1.452-1.047 2.728-2.523 2.923-2.12.282-4.282.427-6.477.427a49.19 49.19 0 0 1-6.477-.427C4.047 21.128 3 19.852 3 18.4Z" />
            </svg>
          </a>
          <a
            className="icon-link"
            href="https://github.com/scale600/oc-health-dba-ml"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View source on GitHub"
            title="View source on GitHub"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
          <a
            className="icon-link"
            href="https://www.linkedin.com/in/scale600"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn profile"
            title="LinkedIn"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </a>
        </div>
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
