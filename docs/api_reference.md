# Upstream API Reference — OC BHP Provider Directory

> **Status: verified live.** Every fact below was confirmed by probing the running API (not assumed). Re-verify before coding; the dataset refreshes monthly and totals drift.

## Connection

| Item | Value |
|------|-------|
| Base URL | `https://bhpproviderdirectory.ochca.com/api/v1/` |
| Authentication | **None** (public, no API key) |
| Swagger / OpenAPI | `https://bhpproviderdirectory.ochca.com/api/swagger/index.html` |
| Human docs | `https://bhpproviderdirectory.ochca.com/api-document` |
| Machine-readable dumps | `https://bhpproviderdirectory.ochca.com/machine-readable-data` |
| Freshness | updated ≤ 30 days after a provider change |

## Endpoints

### Lookup (reference code lists — the FK universe)

`/v1/Lookup/specialties`, `/service-codes`, `/gender-codes`, `/language-codes`, `/taxonomy`, `/facility-types`, `/schedule-codes`, `/population-served-codes`, `/licensure-codes`, `/state-codes`, `/cultural-cap-codes`, `/telehealths`

Each returns an array shaped like:

```json
{ "vers": 1, "code": "1A", "ordinal": 1, "description": "Abuse (Child/Elder/Physical/Sexual) Victims", "enabled": "Y" }
```

### Provider

- `GET /v1/Provider/providers?page={n}&pageSize={n}` — paginated list
- `GET /v1/Provider/{providerId}` — single provider detail
- `GET /v1/Provider/search?...` — filtered search

Search filters: `FirstName, LastName, Gender, Language, Speciality, ProviderType, Telehealth, AcceptNewPatient, Medicare, CHIP, TGITraining, CulturalCapabilityTraining, CulturalCapability`. Multi-value filters use `;` (e.g. `?Gender=M;F`).

### Site

- `GET /v1/Site/sites?page={n}&pageSize={n}` — facility/location records

## Response envelope (pagination)

```json
{
  "data": [ /* array of records */ ],
  "totalCount": 1851,
  "currentPage": 1,
  "pageSize": 100,
  "totalPages": 19
}
```

> **Note:** `totalCount` drifts monthly (was ~1,843, now 1,851). Never hardcode it — the paginator must walk until `currentPage >= totalPages`.

## Provider record schema

```json
{
  "id": 10,
  "lastName": "Gonzalez",
  "firstName": "Andrea",
  "middleName": "Guadalupe",
  "gender": "F",
  "npi": "1285300319",
  "taxonomy": "101Y00000X;101YM0800X",
  "engFluency": "Y",
  "culturalTraining": "Y",
  "medicarePd": "Y",
  "culturalCapabilitiesPd": "A1;A2;A3;B1;C1;...",
  "chipPd": "N",
  "tgitrainingPd": "N",
  "providerLanguages": [
    { "providerId": 10, "code": "spa", "fluency": "A", "validFlag": "Y" }
  ],
  "providerSites": [ /* see below */ ]
}
```

### ⚠️ Nested duplication in `providerSites[]`

Each entry in `providerSites[]` contains a **full nested `providerDto` object that duplicates the parent provider**. The collector MUST strip this nested copy before persisting, or raw snapshots balloon and the ELT double-processes provider fields. Example (verified):

```json
{
  "id": 10, "providerId": 10, "siteId": 21, "isPrimary": true,
  "effDate": "2023-07-01", "expDate": "2028-06-30",
  "licenseNumber": "22965", "licenseType": "PCC",
  "serviceType": "MH;TC",
  "telehealthFlag": "B", "acceptNew": "Y", "validFlag": "Y",
  "dbInsertDt": "2024-04-10T12:25:53.65",
  "providerDto": { /* FULL nested provider — dedupe/ignore */ },
  "site": { /* see Site schema */ }
}
```

## Site schema (nested in `providerSites[].site`)

```json
{
  "id": 21, "planType": "MHP", "name": "CYS Seneca OC South",
  "entity": "00115", "npi2": "1376034371",
  "taxonomy": "251S00000X",
  "address": "22942 EL TORO RD", "city": "LAKE FOREST",
  "state": "CA", "zipCode": "92630-4961", "phone": "(949) 317-1010",
  "webSite": "http://www.senecafoa.org",
  "adacompliant": "Y", "tddTtyAvail": "Y", "telehealthAvail": "B",
  "facilityCode": "25", "serviceType": "CIS;ICC;IHB;..."
}
```

## Verified data facts that drive the design

| # | Fact | Consequence |
|---|------|-------------|
| 1 | **No latitude/longitude anywhere** — only address + ZIP | Geocoding is mandatory (Phase 2/4) |
| 2 | **Provider ↔ Site is many-to-many** | Bridge table `Fact_Provider_Site` |
| 3 | **Multi-value fields use `;`** (`taxonomy`, `serviceType`, `specialtiesPd`, `populationServedPd`, `culturalCapabilitiesPd`) | Normalize into junction tables |
| 4 | **~1,851 providers, 163 sites** | Single collector suffices; static serving works |
| 5 | **Lookup codes are join keys** | `specialtiesPd` → `/Lookup/specialties`, etc. |
| 6 | **Skewed workforce**: ~70% female; 25% Spanish-bilingual (467); MFT 370 / addiction counselor 366 / social worker 195 dominate; psychiatrists 116. 70 taxonomies, 26 languages | Attribute-only clustering will be weak → geographic is the differentiator |
| 7 | **~89% accept new patients; telehealth widespread** | Weak clustering discriminator, strong accessibility filter |

## Counts observed (probed 2026-09)

- Providers: **1,851**
- Sites: **163** (21 cities, 35 ZIPs)
- `planType`: MHP 99 / DMC 1
- Languages: 26 distinct (Spanish 467 providers, Vietnamese 62, Tagalog 31, Korean 29, Mandarin 17)
- Gender: F 1,293 / M 540 / U 16 / AG 1 / MTF 1
