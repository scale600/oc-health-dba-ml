"""Validate referential integrity of the loaded star schema."""

from __future__ import annotations

from . import db

CHECKS = {
    "Dim_Provider rows": "SELECT COUNT(*) FROM Dim_Provider",
    "Dim_Site rows": "SELECT COUNT(*) FROM Dim_Site",
    "Fact_Provider_Site rows": "SELECT COUNT(*) FROM Fact_Provider_Site",
    "orphan specialties": "SELECT COUNT(*) FROM Bridge_Provider_Specialty b LEFT JOIN Dim_Specialty d ON b.specialty_code = d.code WHERE d.code IS NULL",
    "orphan languages": "SELECT COUNT(*) FROM Bridge_Provider_Language b LEFT JOIN Dim_Language d ON b.language_code = d.code WHERE d.code IS NULL",
    "orphan taxonomies": "SELECT COUNT(*) FROM Bridge_Provider_Taxonomy b LEFT JOIN Dim_Taxonomy d ON b.taxonomy_code = d.code WHERE d.code IS NULL",
    "orphan services": "SELECT COUNT(*) FROM Bridge_Provider_Service b LEFT JOIN Dim_Service_Type d ON b.service_code = d.code WHERE d.code IS NULL",
    "orphan populations": "SELECT COUNT(*) FROM Bridge_Provider_Population b LEFT JOIN Dim_Population_Served d ON b.population_code = d.code WHERE d.code IS NULL",
    "orphan fact providers": "SELECT COUNT(*) FROM Fact_Provider_Site f LEFT JOIN Dim_Provider p ON f.provider_key = p.provider_key WHERE p.provider_key IS NULL",
    "orphan fact sites": "SELECT COUNT(*) FROM Fact_Provider_Site f LEFT JOIN Dim_Site s ON f.site_key = s.site_key WHERE s.site_key IS NULL",
    "sites geocoded": "SELECT COUNT(*) FROM Dim_Site WHERE latitude IS NOT NULL",
}


def validate() -> None:
    conn = db.connect()
    cursor = conn.cursor()
    for name, sql in CHECKS.items():
        cursor.execute(sql)
        print(f"{name}: {cursor.fetchone()[0]}")
    conn.close()
