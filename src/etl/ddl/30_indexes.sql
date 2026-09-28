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

-- Spatial index on Dim_Site.geo_point for distance queries
-- (feeds the ML-3 accessibility gap model).
CREATE SPATIAL INDEX SIX_DimSite_geo
    ON dbo.Dim_Site (geo_point);
