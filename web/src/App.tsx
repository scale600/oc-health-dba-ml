import { useMemo, useState } from "react";
import { useData } from "./hooks/useData";
import MapView from "./components/MapView";
import ClusterView from "./components/ClusterView";
import AccessibilityView from "./components/AccessibilityView";

type Tab = "map" | "clusters" | "accessibility";

const TAB_LABELS: Record<Tab, string> = {
  map: "Map",
  clusters: "Clusters",
  accessibility: "Accessibility",
};

export default function App() {
  const data = useData();
  const [tab, setTab] = useState<Tab>("map");

  const kpis = useMemo(() => {
    const sites = data.sites?.features ?? [];
    const isolated = sites.filter((s) => s.properties.is_noise === 1).length;
    const gapZips = data.accessibility.filter((a) => a.gap === 1).length;
    const activeClusters = new Set(
      sites.map((s) => s.properties.cluster).filter((c): c is number => c !== null)
    ).size;
    return {
      providers: data.providers.length,
      sites: sites.length,
      isolated,
      gapZips,
      activeClusters,
      archetypes: data.clusters.length,
    };
  }, [data]);

  if (data.loading) return <div className="loading">Loading data…</div>;
  if (data.error) return <div className="error">Error loading data: {data.error}</div>;

  return (
    <div className="app">
      <header className="header">
        <h1>OC Medi-Cal Behavioral Health</h1>
        <p className="subtitle">Provider Clustering &amp; Accessibility Analysis</p>
      </header>

      <section className="kpi-row">
        <div className="kpi">
          <span className="kpi-value">{kpis.providers.toLocaleString()}</span>
          <span className="kpi-label">Providers</span>
        </div>
        <div className="kpi">
          <span className="kpi-value">{kpis.sites}</span>
          <span className="kpi-label">Sites</span>
        </div>
        <div className="kpi">
          <span className="kpi-value">{kpis.activeClusters}</span>
          <span className="kpi-label">Service hubs</span>
        </div>
        <div className="kpi">
          <span className="kpi-value">{kpis.isolated}</span>
          <span className="kpi-label">Isolated sites</span>
        </div>
        <div className="kpi">
          <span className="kpi-value">{kpis.gapZips}</span>
          <span className="kpi-label">Gap ZIPs</span>
        </div>
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
        {tab === "map" && data.sites && <MapView sites={data.sites} />}
        {tab === "clusters" && (
          <ClusterView clusters={data.clusters} providers={data.providers} />
        )}
        {tab === "accessibility" && <AccessibilityView rows={data.accessibility} />}
      </main>
    </div>
  );
}
