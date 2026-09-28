import type { AccessibilityRow } from "../types";

export default function AccessibilityView({ rows }: { rows: AccessibilityRow[] }) {
  const sorted = [...rows].sort((a, b) => b.nearest_km - a.nearest_km);
  return (
    <table>
      <thead>
        <tr>
          <th>ZIP</th>
          <th>Nearest site (km)</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((r) => (
          <tr key={r.zip} className={r.gap === 1 ? "gap" : ""}>
            <td>{r.zip}</td>
            <td>{r.nearest_km.toFixed(1)}</td>
            <td>
              {r.gap === 1 ? (
                <span className="badge gap">Isolated</span>
              ) : (
                <span className="badge">Connected</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
