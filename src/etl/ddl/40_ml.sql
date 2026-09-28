-- 40_ml.sql — ML output tables (written back to SQL by the ML step).

IF OBJECT_ID('dbo.ML_Site_Hub', 'U') IS NOT NULL DROP TABLE dbo.ML_Site_Hub;
IF OBJECT_ID('dbo.ML_Provider_Archetype', 'U') IS NOT NULL DROP TABLE dbo.ML_Provider_Archetype;
IF OBJECT_ID('dbo.ML_Archetype_Profile', 'U') IS NOT NULL DROP TABLE dbo.ML_Archetype_Profile;
IF OBJECT_ID('dbo.ML_Accessibility_Gap', 'U') IS NOT NULL DROP TABLE dbo.ML_Accessibility_Gap;

CREATE TABLE dbo.ML_Site_Hub (
    site_id   INT         NOT NULL,
    hub_id    INT         NULL,
    is_noise  BIT         NOT NULL,
    run_id    VARCHAR(64) NULL,
    scored_at DATETIME2   NOT NULL CONSTRAINT DF_MLSiteHub_scored DEFAULT SYSUTCDATETIME()
);

CREATE TABLE dbo.ML_Provider_Archetype (
    provider_id INT         NOT NULL,
    archetype   INT         NULL,
    run_id      VARCHAR(64) NULL,
    scored_at   DATETIME2   NOT NULL CONSTRAINT DF_MLProviderArchetype_scored DEFAULT SYSUTCDATETIME()
);

CREATE TABLE dbo.ML_Archetype_Profile (
    archetype              INT           NOT NULL,
    member_count           INT           NOT NULL,
    dominant_language      VARCHAR(32)   NULL,
    dominant_provider_type VARCHAR(32)   NULL,
    accept_new_rate        DECIMAL(5,4)  NULL,
    profile_summary        NVARCHAR(500) NULL
);

CREATE TABLE dbo.ML_Accessibility_Gap (
    zip_code   VARCHAR(10)  NOT NULL,
    dimension  VARCHAR(32)  NOT NULL,
    gap_flag   BIT          NOT NULL,
    nearest_km DECIMAL(9,3) NULL,
    gi_star_z  DECIMAL(9,3) NULL,
    scored_at  DATETIME2    NOT NULL CONSTRAINT DF_MLAccessibilityGap_scored DEFAULT SYSUTCDATETIME()
);
