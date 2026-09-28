"""Load providers into Dim_Provider, Fact_Provider_Site, and Bridge_* tables.

Uses bulk `executemany` inserts (single round-trip per table) rather than
per-row `execute`, which is ~100x faster over a network connection.
"""

from __future__ import annotations

import json

from . import db


def _split(value: str | None) -> list[str]:
    return [x.strip() for x in (value or "").split(";") if x.strip()]


def load(raw_dir: str) -> dict[str, int]:
    with open(f"{raw_dir}/providers.json", encoding="utf-8") as f:
        providers = json.load(f)["data"]

    conn = db.connect()
    cursor = conn.cursor()
    cursor.fast_executemany = True

    # --- bulk insert providers into Dim_Provider ---
    provider_rows = [
        (
            p.get("id"),
            p.get("firstName"),
            p.get("middleName"),
            p.get("lastName"),
            p.get("gender"),
            p.get("npi"),
            p.get("engFluency"),
            p.get("culturalTraining"),
            p.get("medicarePd"),
            p.get("chipPd"),
            p.get("tgitrainingPd"),
        )
        for p in providers
    ]
    cursor.executemany(
        """
        INSERT INTO Dim_Provider (
            provider_id, first_name, middle_name, last_name, gender_code, npi,
            english_fluency_flag, cultural_training_flag, accepts_medicare_flag,
            accepts_chip_flag, tgi_training_flag
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        provider_rows,
    )

    # --- build surrogate-key maps (one query each) ---
    cursor.execute("SELECT provider_id, provider_key FROM Dim_Provider")
    provider_key_map = {pid: pkey for pid, pkey in cursor.fetchall()}
    cursor.execute("SELECT site_id, site_key FROM Dim_Site")
    site_key_map = {sid: skey for sid, skey in cursor.fetchall()}

    # --- collect deduplicated bridge/fact rows ---
    taxonomy_rows: set[tuple[int, str]] = set()
    cap_rows: set[tuple[int, str]] = set()
    language_map: dict[tuple[int, str], str] = {}
    service_rows: set[tuple[int, str]] = set()
    specialty_rows: set[tuple[int, str]] = set()
    population_rows: set[tuple[int, str]] = set()
    fact_rows: list[tuple] = []

    for p in providers:
        pid = p.get("id")
        for code in _split(p.get("taxonomy")):
            taxonomy_rows.add((pid, code))
        for code in _split(p.get("culturalCapabilitiesPd")):
            cap_rows.add((pid, code))
        for lang in p.get("providerLanguages") or []:
            language_map[(pid, lang.get("code"))] = lang.get("fluency")

        for ps in p.get("providerSites") or []:
            site_key = site_key_map.get(ps.get("siteId"))
            if site_key is None:
                continue  # site not loaded (API data-quality gap)
            fact_rows.append(
                (
                    provider_key_map[pid],
                    site_key,
                    1 if ps.get("isPrimary") else 0,
                    ps.get("effDate"),
                    ps.get("expDate"),
                    ps.get("licenseNumber"),
                    ps.get("licenseType"),
                    ps.get("telehealthFlag"),
                    ps.get("acceptNew"),
                    ps.get("validFlag"),
                )
            )
            for code in _split(ps.get("serviceType")):
                service_rows.add((pid, code))
            for code in _split(ps.get("specialtiesPd")):
                specialty_rows.add((pid, code))
            for code in _split(ps.get("populationServedPd")):
                population_rows.add((pid, code))

    # --- bulk insert bridges ---
    cursor.executemany(
        "INSERT INTO Bridge_Provider_Taxonomy (provider_id, taxonomy_code) VALUES (?, ?)",
        list(taxonomy_rows),
    )
    cursor.executemany(
        "INSERT INTO Bridge_Provider_CulturalCap (provider_id, cap_code) VALUES (?, ?)",
        list(cap_rows),
    )
    cursor.executemany(
        "INSERT INTO Bridge_Provider_Language (provider_id, language_code, fluency) VALUES (?, ?, ?)",
        [(pid, code, flu) for (pid, code), flu in language_map.items()],
    )
    cursor.executemany(
        "INSERT INTO Bridge_Provider_Service (provider_id, service_code) VALUES (?, ?)",
        list(service_rows),
    )
    cursor.executemany(
        "INSERT INTO Bridge_Provider_Specialty (provider_id, specialty_code) VALUES (?, ?)",
        list(specialty_rows),
    )
    cursor.executemany(
        "INSERT INTO Bridge_Provider_Population (provider_id, population_code) VALUES (?, ?)",
        list(population_rows),
    )

    # --- bulk insert fact ---
    cursor.executemany(
        """
        INSERT INTO Fact_Provider_Site (
            provider_key, site_key, is_primary_flag, eff_date, exp_date,
            license_number, license_type_code, telehealth_flag,
            accepting_new_patients_flag, valid_flag, snapshot_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(GETDATE() AS DATE))
        """,
        fact_rows,
    )

    conn.close()
    bridge_total = (
        len(taxonomy_rows)
        + len(cap_rows)
        + len(language_map)
        + len(service_rows)
        + len(specialty_rows)
        + len(population_rows)
    )
    return {"providers": len(provider_rows), "fact_rows": len(fact_rows), "bridge_rows": bridge_total}
