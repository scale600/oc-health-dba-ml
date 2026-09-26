# ML Design (v2) — Three-Analysis Suite

> Replaces the original single K-Means pass. Rationale grounded in verified data (see "Evidence" below).

## Why not K-Means?

1. **The signal is geographic.** 163 sites are concentrated in north-central OC (Santa Ana 21, Anaheim 17, Orange 17) with a long isolated tail (Brea 1, Fountain Valley 2). K-Means forces round clusters and mislabels the isolated sites — which are *themselves* the "underserved pocket" signal — as noise.
2. **The attribute space is skewed.** ~70% female, 25% Spanish-bilingual, MFT/counselor/social-worker dominated. K-Means on one-hot categoricals is technically unsound (one-hot is not continuous Euclidean data) and would produce mushy clusters.
3. **The business question is accessibility**, not taxonomy — "where is the gap?" is a spatial-coverage problem, best served by density clustering + a coverage-gap model.

## The three analyses

### ML-1 — Spatial service-hub detection (HDBSCAN)

| Item | Value |
|------|-------|
| Input | geocoded `Dim_Site` lat/lng (163 sites) |
| Technique | HDBSCAN, Haversine metric, `min_cluster_size` 3–5 (tuned) |
| Output | `hub_id` per site; isolated sites → `is_noise` ("underserved pockets") |
| Metric | **DBCV** (density-based clustering validation) + cluster persistence |
| Table | `ML_Site_Hub` |

### ML-2 — Provider profile segmentation (Gower + k-medoids)

| Item | Value |
|------|-------|
| Input | one row per provider (mixed numeric + categorical) |
| Technique | Gower distance → PAM (k-medoids, `scikit-learn-extra`), cross-checked with HDBSCAN on Gower/UMAP |
| Metric | **silhouette-width on the Gower matrix**; `k` chosen from the width curve |
| Output | `archetype` per provider + `ML_Archetype_Profile` (dominant language/type, accept-new rate) |
| Table | `ML_Provider_Archetype` |

#### Feature engineering

| Feature | Type | Construction |
|---------|------|--------------|
| # sites | numeric | count of `providerSites[]` |
| # languages | numeric | count of `providerLanguages[]` |
| # specialties | numeric | count of split `specialtiesPd` codes |
| # populations served | numeric | count of split `populationServedPd` codes |
| cultural-cap breadth | numeric | count of split `culturalCapabilitiesPd` codes |
| provider-type group | categorical | map 70 taxonomies → Psychiatrist / Therapist-Counselor / Social Worker / Nursing / Other |
| gender | categorical | `F` / `M` / other |
| telehealth | categorical | `B` / `N` / `O` |
| accept-new | categorical | `Y` / `N` |
| primary-language group | categorical | Spanish / Asian-language / English-only / Other |

### ML-3 — Accessibility gap model (spatial coverage + hotspot)

| Item | Value |
|------|-------|
| Input | geocoded sites + provider attributes |
| Technique | SQL `GEOGRAPHY` spatial join + thresholding; optional **Getis-Ord Gi\*** cold-spot detection |
| Metric | Gi\* z-score (or threshold rank) |
| Output | ranked ZIP-level gaps: (need dimension) × (no provider within 10 mi) |
| Table | `ML_Accessibility_Gap` |

Need dimensions: language (Spanish, Vietnamese, Korean…), provider type (Psychiatrist vs Therapist), population (Child/Youth vs Adult).

## Honest-failure fallback

If ML-2 silhouette-width < ~0.2, document: *"provider workforce is broadly homogeneous in profile; the real differentiation is geographic"* and lead with ML-1 + ML-3. A low-signal finding, reported honestly with evidence, is a stronger artifact than an inflated silhouette.

## Evaluation & reproducibility

- **DBCV** (ML-1), **silhouette-width on Gower** (ML-2), **Gi\* z-scores** (ML-3) — all recorded in MLflow (params/metrics/artifacts).
- Register the archetype model in the MLflow model registry.
- Emit `cluster_profile.md` with a human-readable label per hub/archetype + the ranked gap list.

## Acceptance criteria

1. All three analyses persisted to SQL with their evaluation metric recorded.
2. `cluster_profile.md` includes ≥1 specific, decision-ready gap finding (e.g. *"ZIP 92675: 0 Vietnamese-speaking providers within 10 mi"*).
3. Metrics visible in MLflow and SQL.
