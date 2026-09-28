"""ML-3: Accessibility gap model — distance-to-nearest-neighbor per ZIP."""

from __future__ import annotations

from collections import defaultdict

import numpy as np

from ..etl import db


def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0  # km
    lat1, lng1, lat2, lng2 = map(np.radians, [lat1, lng1, lat2, lng2])
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    a = np.sin(dlat / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlng / 2) ** 2
    return 2 * r * np.arcsin(np.sqrt(a))


def run() -> dict:
    conn = db.connect()
    cur = conn.cursor()
    cur.execute("DELETE FROM ML_Accessibility_Gap")
    cur.execute(
        "SELECT site_id, zip_code, latitude, longitude FROM Dim_Site "
        "WHERE latitude IS NOT NULL AND zip_code IS NOT NULL"
    )
    rows = cur.fetchall()

    by_zip: dict[str, list[tuple[float, float]]] = defaultdict(list)
    for _sid, zip_code, lat, lng in rows:
        zip5 = (zip_code or "").split("-")[0]
        by_zip[zip5].append((float(lat), float(lng)))

    gap_rows = []
    for zip_code, coords in by_zip.items():
        clat = float(np.mean([c[0] for c in coords]))
        clng = float(np.mean([c[1] for c in coords]))
        nearest = min(
            _haversine(clat, clng, lat2, lng2)
            for z2, coords2 in by_zip.items()
            if z2 != zip_code
            for lat2, lng2 in coords2
        )
        gap_flag = 1 if nearest > 10.0 else 0
        gap_rows.append((zip_code, "any", gap_flag, round(nearest, 3), None))

    cur.executemany(
        "INSERT INTO ML_Accessibility_Gap (zip_code, dimension, gap_flag, nearest_km, gi_star_z) "
        "VALUES (?, ?, ?, ?, ?)",
        gap_rows,
    )
    conn.close()

    n_gaps = sum(1 for r in gap_rows if r[2] == 1)
    return {"zips": len(gap_rows), "gap_zips": n_gaps}
