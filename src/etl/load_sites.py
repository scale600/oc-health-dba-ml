"""Load sites into Dim_Site, geocoding each address (ZIP-centroid fallback)."""

from __future__ import annotations

import json

from . import db
from .geocode import geocode


def load(raw_dir: str) -> dict[str, int]:
    with open(f"{raw_dir}/sites.json", encoding="utf-8") as f:
        sites = json.load(f)["data"]

    conn = db.connect()
    cursor = conn.cursor()
    loaded = 0
    geocoded = 0

    for s in sites:
        address = s.get("address", "")
        city = s.get("city", "")
        state = s.get("state", "")
        zip_code = s.get("zipCode", "")

        lat, lng = geocode(address, city, state, zip_code)
        wkt = f"POINT({lng} {lat})" if (lat is not None and lng is not None) else None

        cursor.execute(
            """
            INSERT INTO Dim_Site (
                site_id, name, plan_type, npi2, taxonomy_code, address1, city, state,
                zip_code, phone, website, ada_compliant_flag, tdd_tty_flag,
                telehealth_avail_flag, latitude, longitude, geo_point
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, geography::STPointFromText(?, 4326))
            """,
            (
                s.get("id"),
                s.get("name"),
                s.get("planType"),
                s.get("npi2"),
                (s.get("taxonomy") or "").split(";")[0] or None,
                address,
                city,
                state,
                zip_code,
                s.get("phone"),
                s.get("webSite"),
                s.get("adacompliant"),
                s.get("tddTtyAvail"),
                s.get("telehealthAvail"),
                lat,
                lng,
                wkt,
            ),
        )
        loaded += 1
        if lat is not None:
            geocoded += 1

    conn.close()
    return {"sites": loaded, "geocoded": geocoded}
