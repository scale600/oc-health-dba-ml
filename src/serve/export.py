"""Export the star schema + ML outputs to static dashboard data (GeoJSON + JSON).

Writes to `web/public/data/`, consumed by the React dashboard with no backend.
"""

from __future__ import annotations

import decimal
import json
from pathlib import Path

from ..etl import db

OUT_DIR = Path("web/public/data")


def _read_rows(sql: str) -> list[dict]:
    conn = db.connect()
    cur = conn.cursor()
    cur.execute(sql)
    cols = [c[0] for c in cur.description]
    rows = []
    for row in cur.fetchall():
        item = {}
        for name, value in zip(cols, row):
            if isinstance(value, decimal.Decimal):
                value = float(value)
            item[name] = value
        rows.append(item)
    conn.close()
    return rows


def _write(name: str, data: object) -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / name).write_text(json.dumps(data), encoding="utf-8")
    return len(data) if isinstance(data, list) else 1


def export_sites() -> int:
    rows = _read_rows(
        """
        SELECT s.site_id, s.name, s.city, s.zip_code, s.latitude, s.longitude,
               s.plan_type, s.telehealth_avail_flag, h.hub_id, h.is_noise
        FROM Dim_Site s
        LEFT JOIN ML_Site_Hub h ON s.site_id = h.site_id
        WHERE s.latitude IS NOT NULL
        """
    )
    features = [
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [float(r["longitude"]), float(r["latitude"])]},
            "properties": {
                "site_id": r["site_id"],
                "name": r["name"],
                "city": r["city"],
                "zip": r["zip_code"],
                "plan_type": r["plan_type"],
                "telehealth": r["telehealth_avail_flag"],
                "cluster": r["hub_id"],
                "is_noise": int(r["is_noise"]),
            },
        }
        for r in rows
    ]
    _write("sites.geojson", {"type": "FeatureCollection", "features": features})
    return len(features)


def export_providers() -> int:
    rows = _read_rows(
        """
        SELECT p.provider_id, p.first_name, p.last_name, p.gender_code, a.archetype
        FROM Dim_Provider p
        LEFT JOIN ML_Provider_Archetype a ON p.provider_id = a.provider_id
        """
    )
    return _write(
        "providers.json",
        [
            {
                "provider_id": r["provider_id"],
                "first_name": r["first_name"],
                "last_name": r["last_name"],
                "gender": r["gender_code"],
                "archetype": r["archetype"],
            }
            for r in rows
        ],
    )


def _dominant_label(
    bridge_table: str, bridge_col: str, dim_table: str
) -> dict[int, tuple[str | None, int]]:
    """Most common label (specialty/language) per archetype via the bridge tables."""
    sql = f"""
        WITH ranked AS (
            SELECT a.archetype, d.description AS label, COUNT(*) AS cnt,
                   ROW_NUMBER() OVER (PARTITION BY a.archetype ORDER BY COUNT(*) DESC) AS rn
            FROM ML_Provider_Archetype a
            JOIN {bridge_table} b ON a.provider_id = b.provider_id
            JOIN {dim_table} d ON b.{bridge_col} = d.code
            GROUP BY a.archetype, d.description
        )
        SELECT archetype, label, cnt FROM ranked WHERE rn = 1
    """
    return {r["archetype"]: (r["label"], int(r["cnt"])) for r in _read_rows(sql)}


def export_clusters() -> int:
    rows = _read_rows(
        """
        SELECT a.archetype, COUNT(*) AS member_count
        FROM ML_Provider_Archetype a
        GROUP BY a.archetype
        ORDER BY a.archetype
        """
    )
    specialties = _dominant_label("Bridge_Provider_Specialty", "specialty_code", "Dim_Specialty")
    languages = _dominant_label("Bridge_Provider_Language", "language_code", "Dim_Language")
    clusters = []
    for r in rows:
        arch = r["archetype"]
        spec, spec_cnt = specialties.get(arch, (None, 0))
        lang, lang_cnt = languages.get(arch, (None, 0))
        clusters.append(
            {
                "archetype": arch,
                "member_count": r["member_count"],
                "dominant_specialty": spec,
                "dominant_specialty_count": spec_cnt,
                "dominant_language": lang,
                "dominant_language_count": lang_cnt,
            }
        )
    return _write("clusters.json", clusters)


def export_accessibility() -> int:
    rows = _read_rows(
        """
        SELECT g.zip_code, g.dimension, g.gap_flag, g.nearest_km,
               AVG(CAST(s.latitude AS FLOAT)) AS latitude,
               AVG(CAST(s.longitude AS FLOAT)) AS longitude
        FROM ML_Accessibility_Gap g
        JOIN Dim_Site s ON LEFT(s.zip_code, 5) = g.zip_code
        WHERE s.latitude IS NOT NULL
        GROUP BY g.zip_code, g.dimension, g.gap_flag, g.nearest_km
        """
    )
    return _write(
        "accessibility.json",
        [
            {
                "zip": r["zip_code"],
                "dimension": r["dimension"],
                "gap": int(r["gap_flag"]),
                "nearest_km": r["nearest_km"],
                "latitude": r["latitude"],
                "longitude": r["longitude"],
            }
            for r in rows
        ],
    )


def export_lookups() -> int:
    def codes(table: str) -> list[dict]:
        return [
            {"code": r["code"], "description": r["description"]}
            for r in _read_rows(f"SELECT code, description FROM {table} ORDER BY code")
        ]

    data = {
        "languages": codes("Dim_Language"),
        "service_types": codes("Dim_Service_Type"),
        "specialties": codes("Dim_Specialty"),
    }
    return _write("lookups.json", data)


def main() -> None:
    print("sites:", export_sites())
    print("providers:", export_providers())
    print("clusters:", export_clusters())
    print("accessibility:", export_accessibility())
    print("lookups:", export_lookups())
    print("done ->", OUT_DIR)


if __name__ == "__main__":
    main()
