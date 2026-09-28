import type { Cluster, Provider } from "../types";

function dominantGender(providers: Provider[], archetype: number): string {
  const counts = new Map<string, number>();
  for (const p of providers) {
    if (p.archetype !== archetype) continue;
    const g = p.gender ?? "unknown";
    counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? "n/a";
}

export default function ClusterView({
  clusters,
  providers,
}: {
  clusters: Cluster[];
  providers: Provider[];
}) {
  return (
    <div className="cards">
      {clusters.map((c) => (
        <div className="card" key={c.archetype}>
          <h3>Archetype {c.archetype}</h3>
          <div className="stat">
            <strong>{c.member_count.toLocaleString()}</strong> providers
          </div>
          <div className="stat">
            Dominant gender: <strong>{dominantGender(providers, c.archetype)}</strong>
          </div>
          <div className="stat">
            Specialty:{" "}
            <strong>
              {c.dominant_specialty
                ? `${c.dominant_specialty} (${c.dominant_specialty_count})`
                : "n/a"}
            </strong>
          </div>
          <div className="stat">
            Language:{" "}
            <strong>
              {c.dominant_language
                ? `${c.dominant_language} (${c.dominant_language_count})`
                : "no language data"}
            </strong>
          </div>
        </div>
      ))}
    </div>
  );
}
