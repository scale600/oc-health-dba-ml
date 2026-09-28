# Cluster & Archetype Profiles

Human-readable labels for the unsupervised ML outputs. Generated from the star schema via the
`ML_Provider_Archetype` and `ML_Site_Hub` tables. See [`ml_design.md`](ml_design.md) for the
methodology (Gower + k-medoids, HDBSCAN, accessibility-gap).

## Provider archetypes (Gower distance + k-medoids)

Four provider archetypes clustered on gender, specialty, and language (silhouette **0.267** —
weak but real structure; the workforce is broadly homogeneous). Percentages are of the 1,851
providers.

### Archetype 0 — Crisis-Intervention Specialists (female-dominant, Spanish-bilingual)

- **278 providers** (15%)
- Dominant specialty: **Crisis Intervention Services** (33)
- Dominant language: **Spanish** (206 — ~74% of members)
- Gender: 237 F / 40 M / 1 U

**Profile**: Overwhelmingly female crisis-intervention clinicians, heavily Spanish-bilingual.
The emergency-response / crisis-stabilization tier of the workforce.

### Archetype 1 — Individual Therapists (male-majority, Spanish-bilingual)

- **262 providers** (14%)
- Dominant specialty: **Individual Therapy** (147 — ~56% of members)
- Dominant language: **Spanish** (153 — ~58%)
- Gender: 152 M / 109 F / 1 U

**Profile**: The only male-majority archetype; outpatient individual-therapy practitioners,
majority Spanish-speaking.

### Archetype 2 — Individual Therapists (female-dominant)

- **498 providers** (27%)
- Dominant specialty: **Individual Therapy** (173)
- Dominant language: **Spanish** (108)
- Gender: 417 F / 71 M / 9 U / 1 AG

**Profile**: The largest therapy-focused cohort; strongly female, with moderate (not dominant)
Spanish coverage.

### Archetype 3 — Substance-Use-Disorder Providers (no language data)

- **813 providers** (44% — largest)
- Dominant specialty: **Substance Use Disorder (SUD) Services and Education** (202)
- Dominant language: **none recorded** (0)
- Gender: 530 F / 277 M / 5 U / 1 MTF

**Profile**: The SUD-treatment tier — the largest single group. **Language capability is not
recorded for this archetype**, a data-collection gap worth flagging.

## Spatial service hubs (HDBSCAN, Haversine metric)

16 geographic hubs plus 32 isolated (noise) sites. Hubs are named by their most-common city.

| Hub | Center city | Sites | Providers |
|-----|-------------|-------|-----------|
| 0 | Upland | 6 | 131 |
| 1 | Mission Viejo | 13 | 172 |
| 2 | Trabuco Canyon | 5 | 86 |
| 3 | Anaheim | 4 | 43 |
| 4 | Westminster | 8 | 69 |
| 5 | Garden Grove | 6 | 68 |
| 6 | Fullerton | 5 | 69 |
| 7 | Costa Mesa | 8 | 95 |
| 8 | Fountain Valley | 4 | 50 |
| 9 | Anaheim | 4 | 33 |
| 10 | Anaheim | 14 | 208 |
| 11 | Orange | 4 | 116 |
| 12 | Santa Ana | 13 | 178 |
| 13 | Santa Ana | 8 | 129 |
| 14 | Orange | 5 | 171 |
| 15 | Orange | 8 | 177 |

The **Anaheim / Santa Ana / Orange corridor** concentrates the largest hubs (10, 12, 14, 15),
consistent with those cities' top provider counts. Hub 0 (Upland) is the only hub centered outside
Orange County.

## Accessibility gaps

3 ZIP codes are ≥10 km from the nearest service site:

| ZIP | Area | Distance to nearest site |
|-----|------|--------------------------|
| 92672 | San Clemente | 12.0 km |
| 92316 | Bloomington | 23.9 km |
| 91367 | Woodland Hills | 63.1 km |

`92672` is in Orange County; the other two are in neighboring counties.
