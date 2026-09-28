"""Load lookup code lists into the Dim_* reference tables."""

from __future__ import annotations

import json

from . import db

LOOKUP_TABLE_MAP = {
    "specialties": "Dim_Specialty",
    "service-codes": "Dim_Service_Type",
    "taxonomy": "Dim_Taxonomy",
    "language-codes": "Dim_Language",
    "population-served-codes": "Dim_Population_Served",
    "gender-codes": "Dim_Gender",
    "licensure-codes": "Dim_Licensure_Type",
}


def load(raw_dir: str) -> dict[str, int]:
    with open(f"{raw_dir}/lookups.json", encoding="utf-8") as f:
        lookups = json.load(f)

    conn = db.connect()
    counts: dict[str, int] = {}
    for key, table in LOOKUP_TABLE_MAP.items():
        rows = lookups.get(key, [])
        conn.cursor().executemany(
            f"INSERT INTO {table} (code, description, ordinal, enabled) VALUES (?, ?, ?, ?)",
            [(r.get("code"), r.get("description"), r.get("ordinal"), r.get("enabled")) for r in rows],
        )
        counts[table] = len(rows)
    conn.close()
    return counts
