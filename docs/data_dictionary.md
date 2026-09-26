# Data Dictionary — Star Schema

> Derived 1:1 from the verified API fields (`docs/api_reference.md`). `;`-delimited columns are normalized into junction tables. `_key` columns are surrogate `INT IDENTITY` keys; source `id`s are preserved as business keys.

## Naming conventions

- Tables: `Dim_*`, `Fact_*`, `Bridge_*`, `Staging_*`, `ML_*`
- Surrogate PK: `<entity>_key` (INT IDENTITY)
- Business key: `<entity>_id` (source `id`)
- Flags: `CHAR(1)` (`Y`/`N`/`B`) or `BIT`
- Source field is noted per column; `—` means derived/enriched.

## Dimensions

### Dim_Provider (grain = one provider)

| Column | Type | Source field |
|--------|------|--------------|
| provider_key | INT IDENTITY PK | — |
| provider_id | INT UNIQUE | `id` |
| first_name / middle_name / last_name | NVARCHAR(100) | `firstName` / `middleName` / `lastName` |
| gender_code | CHAR(1) | `gender` |
| npi | CHAR(10) | `npi` |
| english_fluency_flag | CHAR(1) | `engFluency` |
| cultural_training_flag | CHAR(1) | `culturalTraining` |
| accepts_medicare_flag | CHAR(1) | `medicarePd` |
| accepts_chip_flag | CHAR(1) | `chipPd` |
| tgi_training_flag | CHAR(1) | `tgitrainingPd` |

### Dim_Site (grain = one location)

| Column | Type | Source field |
|--------|------|--------------|
| site_key | INT IDENTITY PK | — |
| site_id | INT UNIQUE | `id` |
| name | NVARCHAR(200) | `name` |
| plan_type | VARCHAR(10) | `planType` |
| npi2 | CHAR(10) | `npi2` |
| taxonomy_code | VARCHAR(32) | `taxonomy` |
| address1 / city / state | NVARCHAR(200) / NVARCHAR(100) / CHAR(2) | `address` / `city` / `state` |
| zip_code | VARCHAR(10) | `zipCode` |
| phone / website | NVARCHAR(32) / NVARCHAR(256) | `phone` / `webSite` |
| ada_compliant_flag / tdd_tty_flag / telehealth_avail_flag | CHAR(1) | `adacompliant` / `tddTtyAvail` / `telehealthAvail` |
| latitude / longitude | DECIMAL(9,6) | **geocoded** (not in API) |
| geo_point | GEOGRAPHY | derived from lat/lng (spatial index) |
| census_tract / county | NVARCHAR(16) / NVARCHAR(64) | geocoding enrichment (optional) |

### Lookup dimensions

`Dim_Service_Type`, `Dim_Specialty`, `Dim_Taxonomy`, `Dim_Language`, `Dim_Population_Served`, `Dim_Gender`, `Dim_Licensure_Type`, `Dim_Date` — each keyed by the API `code` with a `description` column (and `ordinal` / `enabled` where present).

## Fact table

### Fact_Provider_Site (grain = one provider at one site — the M:N bridge)

| Column | Type | Source field |
|--------|------|--------------|
| provider_site_key | INT IDENTITY PK | — |
| provider_key | INT FK → Dim_Provider | — |
| site_key | INT FK → Dim_Site | — |
| is_primary_flag | BIT | `isPrimary` |
| eff_date / exp_date | DATE | `effDate` / `expDate` |
| license_number / license_type_code | NVARCHAR(32) / VARCHAR(8) | `licenseNumber` / `licenseType` |
| telehealth_flag | CHAR(1) | `telehealthFlag` |
| accepting_new_patients_flag | CHAR(1) | `acceptNew` |
| valid_flag | CHAR(1) | `validFlag` |
| snapshot_date | DATE | ingestion timestamp |

## Junction tables (M:N normalization of `;` fields)

| Table | Columns |
|-------|---------|
| Bridge_Provider_Specialty | `provider_id`, `specialty_code` |
| Bridge_Provider_Language | `provider_id`, `language_code`, `fluency` |
| Bridge_Provider_Taxonomy | `provider_id`, `taxonomy_code` |
| Bridge_Provider_Service | `provider_id`, `service_code` |
| Bridge_Provider_Population | `provider_id`, `population_code` |
| Bridge_Provider_CulturalCap | `provider_id`, `cap_code` |

## ML output tables

| Table | Key columns |
|-------|-------------|
| ML_Site_Hub | `site_id`, `hub_id`, `is_noise`, `run_id`, `scored_at` |
| ML_Provider_Archetype | `provider_id`, `archetype`, `run_id`, `scored_at` |
| ML_Archetype_Profile | `archetype`, `member_count`, `dominant_language`, `dominant_provider_type`, `accept_new_rate`, `profile_summary` |
| ML_Accessibility_Gap | `zip_code`, `dimension`, `gap_flag`, `nearest_km`, `gi_star_z`, `scored_at` |

## Referential-integrity rules

1. Every `Bridge_*` code MUST resolve to its lookup dimension (no orphans) — validated in ELT acceptance.
2. `Fact_Provider_Site.provider_key`/`site_key` MUST reference valid dim rows.
3. Geocoding coverage > 95% of `Dim_Site` rows (ZIP-centroid fallback otherwise).
4. No SQL-auth passwords in prod — Entra ID only (`docs/runbook.md`).
