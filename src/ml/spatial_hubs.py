"""ML-1: Spatial service-hub detection via HDBSCAN on geocoded site coordinates."""

from __future__ import annotations

import datetime

import hdbscan
import numpy as np

from ..etl import db


def run() -> dict:
    conn = db.connect()
    cur = conn.cursor()
    cur.execute("DELETE FROM ML_Site_Hub")
    cur.execute("SELECT site_id, latitude, longitude FROM Dim_Site WHERE latitude IS NOT NULL")
    rows = cur.fetchall()

    site_ids = [r[0] for r in rows]
    coords = np.radians(np.array([[r[1], r[2]] for r in rows], dtype=float))

    clusterer = hdbscan.HDBSCAN(min_cluster_size=3, metric="haversine")
    labels = clusterer.fit_predict(coords)
    dbcv = float(clusterer._relative_validity) if clusterer._relative_validity is not None else 0.0

    run_id = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    cur.executemany(
        "INSERT INTO ML_Site_Hub (site_id, hub_id, is_noise, run_id) VALUES (?, ?, ?, ?)",
        [
            (site_id, (None if label == -1 else int(label)), (1 if label == -1 else 0), run_id)
            for site_id, label in zip(site_ids, labels)
        ],
    )

    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    n_noise = int((labels == -1).sum())
    conn.close()
    return {"sites": len(site_ids), "clusters": n_clusters, "noise": n_noise, "dbcv": round(dbcv, 3)}
