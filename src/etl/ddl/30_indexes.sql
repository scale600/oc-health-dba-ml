-- 30_indexes.sql
-- Indexing strategy: clustered PKs on *_key identity columns (implicit),
-- non-clustered for common access paths, and a GEOGRAPHY spatial index for
-- radius/distance queries (accessibility analysis).

-- ZIP lookups on sites (accessibility roll-ups)
CREATE NONCLUSTERED INDEX IX_DimSite_zip
    ON dbo.Dim_Site (zip_code);

-- NPI lookup on providers
CREATE NONCLUSTERED INDEX IX_DimProvider_npi
    ON dbo.Dim_Provider (npi);

-- Fact access paths (filter by provider / by site)
CREATE NONCLUSTERED INDEX IX_FactProviderSite_provider
    ON dbo.Fact_Provider_Site (provider_key);

CREATE NONCLUSTERED INDEX IX_FactProviderSite_site
    ON dbo.Fact_Provider_Site (site_key);

-- NOTE: A spatial index on Dim_Site.geo_point requires geo_point to be NOT NULL.
-- Since geocoding coverage is ~95% (geo_point is nullable), the spatial index is
-- deferred until after geocoding completes. With only ~147 sites, STDistance()
-- queries are fast without an index. If coverage reaches 100%, run:
--
--   CREATE SPATIAL INDEX SIX_DimSite_geo ON dbo.Dim_Site (geo_point);

