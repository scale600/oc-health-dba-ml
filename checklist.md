# Implementation Checklist

An execution checklist ordered by actual build sequence. Work top-to-bottom; check each item as it is completed.

> **Usage**: each item is structured as `what / how / expected result`. Verify the acceptance criterion when ticking ✅.
> Source of truth: `note.md` (plan) · `docs/api_reference.md` (API) · `docs/data_dictionary.md` (schema) · `docs/ml_design.md` (ML) · `docs/runbook.md` (DBA)

---

## P0 — Foundation (git + environment)

- [ ] `git init` and first commit — confirm `.gitignore` excludes `.env`, `.venv`, `web/public/data/`, `mlruns/`
- [ ] `cp .env.example .env` — fill in non-secret values only (API base, container name, etc.)
- [ ] `python3 -m venv .venv` + install `requests/pandas/pyodbc/scikit-learn/scikit-learn-extra/hdbscan/mlflow/python-dotenv`
- [ ] Verify API connectivity: `curl ".../Provider/providers?page=1&pageSize=1"` → `totalCount ≈ 1851`
- [ ] Scaffold directories: `src/{collector,etl,ml,serve}`, `web/`, `infra/terraform/`, `.github/workflows/`
- [ ] `infra/terraform`: `terraform init` → `plan` → `apply` (SQL free offer via azapi + Storage + GH Actions IP firewall)

**Acceptance**: `git status` clean (only tracked files); `curl` succeeds.

## P1 — Collector (API → Blob)

- [ ] `api_client.py`: generic paginator — walk until `currentPage >= totalPages`; never hardcode `totalCount`
- [ ] **Strip nested `providerDto`** — drop the duplicated provider object inside `providerSites[]` before persisting (`docs/api_reference.md` warning)
- [ ] Collect three datasets: providers, sites, and every `/v1/Lookup/*`
- [ ] `collect.py`: invoked by `pipeline.yml` via `schedule` (daily) + `workflow_dispatch` (backfill)
- [ ] Store raw JSON losslessly (for reprocessing / reproducibility)

**Acceptance**: rerunning a backfill yields the same `totalCount` with no duplicates (idempotent).

## P2 — DDL (star schema)

- [ ] `00_staging.sql`: `Staging_Provider/Site/ProviderSite` (raw columns, unnormalized)
- [ ] `10_dim.sql`: `Dim_Provider`, `Dim_Site`, lookup dims (per `docs/data_dictionary.md`)
- [ ] `20_fact.sql`: `Fact_Provider_Site` + 6 `Bridge_*` tables
- [ ] `30_indexes.sql`: clustered PKs + `Dim_Site(zip_code)` · `Fact(provider_key,site_key)` · `Dim_Site(lat,lng)` + `GEOGRAPHY` spatial index

**Acceptance**: DDL runs against SQL without error (before `npm run build`).

## P3 — ELT (Blob → SQL)

- [ ] `load_lookups.py`: load lookup codes (build the FK universe)
- [ ] `load_providers.py` / `load_sites.py`: upsert dim + fact
- [ ] Normalize `;`-delimited fields → `Bridge_*` (empty/missing → NULL, log orphans)
- [ ] `geocode.py`: US Census Geocoder (keyless) → `latitude/longitude`, ZIP-centroid fallback, `Geocode_Cache` caching
- [ ] Run referential-integrity validation query

**Acceptance**: `Fact_Provider_Site` row count ≈ total `providerSites` entries; every `Bridge_*` code resolves 100% against lookups (0 orphans).

## P4 — ML (3 analyses)

- [ ] `features.py`: Gower feature matrix (5 numeric + 5 grouped categorical, per `docs/ml_design.md` feature table)
- [ ] `spatial_hubs.py`: HDBSCAN (Haversine, min_cluster_size 3–5) → `ML_Site_Hub`, record **DBCV**
- [ ] `archetypes.py`: Gower + PAM (k-medoids) → `ML_Provider_Archetype`, record **silhouette-width**; cross-check with HDBSCAN
- [ ] `accessibility_gap.py`: SQL GEOGRAPHY spatial join + need dimensions (language × type × population) × 10 mi radius → `ML_Accessibility_Gap`, record **Gi\* z-score**
- [ ] `evaluate.py` + MLflow tracking (params/metrics/artifacts) + register archetype model
- [ ] `cluster_profile.md`: hub/archetype labels + ranked gap list

**Acceptance**: all 3 analyses persisted to SQL + metrics recorded; ≥1 specific gap finding ("ZIP 92675: 0 Vietnamese-speaking providers within 10 mi"). If silhouette < 0.2, report "homogeneous workforce" honestly.

## P5 — Export (SQL → static)

- [ ] `export.py`: `sites.geojson` (with cluster labels) + `providers.json` + `clusters.json` + `accessibility.json` + `lookups.json`
- [ ] Write to `web/public/data/`

**Acceptance**: GeoJSON loads in MapLibre; all files are self-contained static data.

## P6 — Dashboard (React)

- [ ] Scaffold Vite + React + TS + Tailwind
- [ ] KPI row: total providers/sites, % accepting new patients, bilingual %, active clusters
- [ ] Map view: MapLibre GL — sites colored by cluster, filters (service · language · accept-new · telehealth)
- [ ] Cluster view: cluster cards (profile, dominant language/type, member count, centroid)
- [ ] Accessibility view: ZIP choropleth + distance · language-coverage gap highlights
- [ ] Client-side filtering (no runtime backend)

**Acceptance**: `npm run build` succeeds; all views render from `/data/*.json`; filtering is fully client-side.

## P7 — Deploy (Cloudflare)

- [ ] Cloudflare Pages project (build: `npm run build`, output: `web/dist`)
- [ ] Connect custom domain `oc-health-dba-ml.techcloudup.com`
- [ ] `deploy.yml`: deploy on push to main
- [ ] `pipeline.yml`: scheduled (daily) collect→load→ML→export → commit data → redeploy

**Acceptance**: `curl -I https://oc-health-dba-ml.techcloudup.com` → 200 over HTTPS; manual pipeline run updates data.

## P8 — DBA Hardening (evidence collection)

- [ ] Firewall allow-list (no wildcard `0.0.0.0`)
- [ ] Entra ID auth (no SQL-auth passwords in prod)
- [ ] TDE verification: `encryption_state = 3` (`docs/runbook.md` SQL)
- [ ] PITR restore test (within 7-day window) + row-count match
- [ ] Add GitHub Actions IP ranges to firewall (`actions` from `https://api.github.com/meta`)

**Acceptance**: a non-allow-listed IP is rejected; TDE=3; restore test row counts match (keep screenshots).

## P9 — Docs & DoD

- [ ] Re-verify `docs/` ↔ implementation consistency (schema · features · API fields)
- [ ] `README.md` reproduction walkthrough (clone → collect → load → ML → serve → dashboard)
- [ ] Confirm monthly cost ≤ $5
- [ ] Final DoD roll-up

---

## Definition of Done (final)

- [ ] Collector idempotent (providers/sites/lookups)
- [ ] Star schema referential integrity 100%
- [ ] Geocoding coverage > 95%
- [ ] ML 3 analyses + metrics (DBCV/silhouette/Gi*) persisted
- [ ] Cluster/gap profiles written (human-readable labels)
- [ ] Dashboard builds and renders map/cluster/accessibility views
- [ ] `https://oc-health-dba-ml.techcloudup.com` HTTPS 200
- [ ] Scheduled refresh automated
- [ ] README enables end-to-end reproduction
- [ ] Monthly cost ≤ $5
