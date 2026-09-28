# DBA Operations Runbook

Operational procedures for the Azure SQL Database backing this project. This document is itself a portfolio artifact — it demonstrates DBA discipline beyond "the schema exists."

## Environment

| Item | Value |
|------|-------|
| Service | Azure SQL Database (serverless, **free offer**) |
| Free limits | 100,000 vCore-sec/mo, 32 GB data, 32 GB backup |
| ⚠️ Free-tier constraints | max **4 vCore**; **PITR retention 7 days**; no long-term backup retention; auto-pause until next month when limits hit |
| Auth | Entra ID (no SQL-auth passwords in prod) |
| Encryption | TDE (enabled) |

## 1. Security hardening

1. **Firewall** — restrict to allow-listed IPs. For GitHub-hosted runners, add GitHub's published Actions IP ranges (from `https://api.github.com/meta` → `actions`) via Terraform; for full lockdown use a static-IP self-hosted runner. No `0.0.0.0` allow rule.
2. **Entra ID auth** — service principal / managed identity for the ELT + export runners; `AZURE_SQL_USER` left empty in prod.
3. **TDE** — verify `sys.dm_database_encryption_keys.encryption_state = 3`.
4. **Least privilege** — ELT account gets only `db_datawriter` on target tables; export account gets `db_datareader`.

### Verification

```sql
-- TDE state (3 = encrypted)
SELECT DB_NAME(database_id), encryption_state
FROM sys.dm_database_encryption_keys;

-- current principals (should be Entra, not SQL auth)
SELECT name, type_desc, authentication_type_desc
FROM sys.database_principals
WHERE type IN ('E','X');
```

## 2. Backup & restore

The free offer auto-backups with **7-day PITR**. No long-term retention available in auto-pause mode.

### Point-in-time restore (PITR)

```bash
az sql db restore \
  --dest-name ocbh_provider_restored \
  --name ocbh_provider \
  --resource-group <rg> \
  --server oc-health-dba-ml \
  --time "2026-09-26T00:00:00Z"
```

### Restore test (quarterly)

1. Restore to `ocbh_provider_restored` at a known timestamp.
2. `SELECT COUNT(*) FROM Fact_Provider_Site` on both — counts must match.
3. Spot-check referential integrity on the restored copy.

> **Last verified: 2026-09-28.** Restored `ocbh_provider` → `ocbh_provider_restored`
> (point-in-time ~18:20 UTC) and compared row counts — all 10 key tables matched
> (Dim_Provider 1851, Dim_Site 147, Fact_Provider_Site 2291, Dim_Specialty 142, Dim_Language 43,
> Bridge_Provider_Specialty 7151, Bridge_Provider_Language 675, ML_Site_Hub 147,
> ML_Provider_Archetype 1851, ML_Accessibility_Gap 44). Restored copy deleted after verification.
> Note: the free-offer restore is slow (~5 min) and the CLI "DatabaseNameInUse" error appears
> transiently while a prior restore is still creating — re-check `az sql db list` before retrying.

### Logical backup (portable fallback)

```bash
# schema + data export (works within 7-day window, survives DB deletion)
az sql db export --admin-user <admin> --admin-password <pw> \
  --storage-key <key> --storage-key-type StorageAccessKey \
  --storage-uri "https://<account>.blob.core.windows.net/backups/ocbh_$(date +%F).bacpac"
```

## 3. Scheduled automation (GitHub Actions)

Scheduling is driven by `.github/workflows/pipeline.yml` (`schedule` cron + `workflow_dispatch`). No Azure Functions or Elastic Job Agent required.

- Daily: collect (public API) → ELT (Blob → SQL) → ML scoring → export (SQL → JSON) → commit data → trigger Pages rebuild.
- Auth: OIDC federation (`azure/login@v2` + federated identity credential) — no long-lived secrets.
- Elastic Job Agent remains an optional alternative; verify pricing before relying on it.

## 4. Cost guardrails

- Enable **60-min auto-pause** (serverless).
- Monitor vCore-seconds in the portal; the 100k vCore-sec/mo allowance is the ceiling.
- Static dashboard serving means the DB is touched only during scheduled refresh — no runtime dependency.

## 5. Recovery scenarios

| Scenario | Action |
|----------|--------|
| Accidental data delete | PITR restore within 7 days |
| Provider data drift | Re-run idempotent collector backfill (raw snapshots in Blob) |
| Free-tier limit hit | Auto-pause until next month; or move export cadence to weekly |
| Geocoding failure | ZIP-centroid fallback (`Geocode_Cache` retains successful lookups) |
