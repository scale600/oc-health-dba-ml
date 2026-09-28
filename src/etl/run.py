"""Orchestrate the full ELT: clear -> lookups -> sites (geocode) -> providers -> validate."""

from __future__ import annotations

from . import db, load_lookups, load_providers, load_sites, validate

CLEAR_ORDER = [
    "Fact_Provider_Site",
    "Bridge_Provider_Specialty",
    "Bridge_Provider_Language",
    "Bridge_Provider_Taxonomy",
    "Bridge_Provider_Service",
    "Bridge_Provider_Population",
    "Bridge_Provider_CulturalCap",
    "Dim_Provider",
    "Dim_Site",
    "Dim_Specialty",
    "Dim_Service_Type",
    "Dim_Taxonomy",
    "Dim_Language",
    "Dim_Population_Served",
    "Dim_Gender",
    "Dim_Licensure_Type",
]


def _clear_tables() -> None:
    conn = db.connect()
    cur = conn.cursor()
    for table in CLEAR_ORDER:
        cur.execute(f"DELETE FROM {table}")
    conn.close()


def main() -> None:
    raw_dir = db.latest_raw_dir()
    print(f"raw dir: {raw_dir}")
    _clear_tables()
    print("cleared dim/fact tables")
    print("lookups:", load_lookups.load(raw_dir))
    print("sites:", load_sites.load(raw_dir))
    print("providers:", load_providers.load(raw_dir))
    print("--- referential integrity ---")
    validate.validate()


if __name__ == "__main__":
    main()
