import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AccessibilityRow, CityStat, Cluster, SitesGeoJSON } from "../types";
import { toTitleCase } from "../utils";

const tooltipStyle = {
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 6,
  color: "#e2e8f0",
  fontSize: 12,
} as const;

const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b"];

interface InsightsViewProps {
  cityStats: CityStat[];
  clusters: Cluster[];
  sites: SitesGeoJSON;
  accessibility: AccessibilityRow[];
}

export default function InsightsView({
  cityStats,
  clusters,
  sites,
  accessibility,
}: InsightsViewProps) {
  const byProvider = useMemo(
    () => [...cityStats].sort((a, b) => b.provider_count - a.provider_count),
    [cityStats]
  );
  const bySite = useMemo(
    () => [...cityStats].sort((a, b) => b.site_count - a.site_count),
    [cityStats]
  );

  const planTypeData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of sites.features) {
      const p = f.properties.plan_type ?? "Unknown";
      counts.set(p, (counts.get(p) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [sites]);

  const archetypeData = useMemo(
    () =>
      clusters.map((c) => ({
        name: `Archetype ${c.archetype}`,
        members: c.member_count,
      })),
    [clusters]
  );

  const gapZips = useMemo(
    () => accessibility.filter((a) => a.gap === 1),
    [accessibility]
  );

  const topCityProviders = byProvider[0];
  const topCitiesSites = bySite.slice(0, 3).map((c) => c.city);
  const largestArchetype = clusters.reduce(
    (max, c) => (c.member_count > (max?.member_count ?? 0) ? c : max),
    clusters[0]
  );

  const totalProviders = clusters.reduce((s, c) => s + c.member_count, 0);

  return (
    <div className="insights">
      <section className="findings">
        <h2>Key findings</h2>
        <ul className="finding-list">
          <li>
            <strong>{toTitleCase(topCityProviders?.city ?? "—")}</strong> has the most providers (
            {topCityProviders?.provider_count.toLocaleString()}) despite fewer sites than{" "}
            {toTitleCase(bySite[0]?.city ?? "—")} — large treatment facilities concentrate the
            workforce.
          </li>
          <li>
            Top cities by sites: {topCitiesSites.map(toTitleCase).join(", ")}.
          </li>
          {largestArchetype && (
            <li>
              <strong>Archetype {largestArchetype.archetype}</strong> is the largest (
              {largestArchetype.member_count.toLocaleString()} providers,{" "}
              {Math.round((largestArchetype.member_count / totalProviders) * 100)}%) and{" "}
              {largestArchetype.dominant_language
                ? `is ${largestArchetype.dominant_language}-dominant`
                : "has no language data recorded"}.
            </li>
          )}
          <li>
            <strong>{gapZips.length} ZIP codes</strong> are service gaps (≥10 km to nearest site):{" "}
            {gapZips
              .map((g) => `${g.zip} (${g.nearest_km.toFixed(0)} km)`)
              .join(", ")}
            .
          </li>
        </ul>
      </section>

      <section className="charts-grid">
        <div className="chart-card chart-wide">
          <h3>Providers by city (top 10)</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={byProvider.slice(0, 10).map((c) => ({
                city: toTitleCase(c.city),
                providers: c.provider_count,
              }))}
              layout="vertical"
              margin={{ left: 8, right: 16 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="city"
                width={104}
                stroke="#94a3b8"
                tick={{ fill: "#e2e8f0", fontSize: 12 }}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(99,102,241,0.08)" }} />
              <Bar dataKey="providers" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Archetype composition</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={archetypeData} margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: "#e2e8f0", fontSize: 12 }} />
              <YAxis stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(99,102,241,0.08)" }} />
              <Bar dataKey="members" fill="#818cf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Plan type</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={planTypeData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={2}
              >
                {planTypeData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend
                formatter={(value: string) =>
                  value === "MHP" ? "MHP — Mental Health Plan" : value === "DMC" ? "DMC — Drug Medi-Cal" : value
                }
                iconType="circle"
                wrapperStyle={{ color: "#e2e8f0", fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
