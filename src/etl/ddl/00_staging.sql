-- 00_staging.sql
-- Raw staging tables. Columns mirror the API payloads; no normalization yet.
-- The ELT loads raw JSON here, then splits ';'-delimited fields into bridge tables.

IF OBJECT_ID('dbo.Staging_Provider', 'U') IS NOT NULL DROP TABLE dbo.Staging_Provider;
IF OBJECT_ID('dbo.Staging_Site', 'U') IS NOT NULL DROP TABLE dbo.Staging_Site;
IF OBJECT_ID('dbo.Staging_ProviderSite', 'U') IS NOT NULL DROP TABLE dbo.Staging_ProviderSite;

CREATE TABLE dbo.Staging_Provider (
    provider_id              INT           NOT NULL,
    last_name                NVARCHAR(100) NULL,
    first_name               NVARCHAR(100) NULL,
    middle_name              NVARCHAR(100) NULL,
    gender                   CHAR(1)       NULL,
    npi                      CHAR(10)      NULL,
    taxonomy                 NVARCHAR(MAX) NULL,  -- ';'-delimited
    eng_fluency              CHAR(1)       NULL,
    cultural_training        CHAR(1)       NULL,
    medicare_pd              CHAR(1)       NULL,
    cultural_capabilities_pd NVARCHAR(MAX) NULL,  -- ';'-delimited
    chip_pd                  CHAR(1)       NULL,
    tgi_training_pd          CHAR(1)       NULL,
    snapshot_date            DATE          NOT NULL
);

CREATE TABLE dbo.Staging_Site (
    site_id          INT           NOT NULL,
    plan_type        VARCHAR(10)   NULL,
    name             NVARCHAR(200) NULL,
    entity           VARCHAR(16)   NULL,
    npi2             CHAR(10)      NULL,
    taxonomy         NVARCHAR(MAX) NULL,  -- ';'-delimited (usually single)
    address          NVARCHAR(200) NULL,
    city             NVARCHAR(100) NULL,
    state            CHAR(2)       NULL,
    zip_code         VARCHAR(10)   NULL,
    phone            NVARCHAR(32)  NULL,
    website          NVARCHAR(256) NULL,
    ada_compliant    CHAR(1)       NULL,
    tdd_tty_avail    CHAR(1)       NULL,
    telehealth_avail CHAR(1)       NULL,
    facility_code    VARCHAR(16)   NULL,
    service_type     NVARCHAR(MAX) NULL,  -- ';'-delimited
    snapshot_date    DATE          NOT NULL
);

CREATE TABLE dbo.Staging_ProviderSite (
    provider_site_id     INT           NOT NULL,
    provider_id          INT           NOT NULL,
    site_id              INT           NOT NULL,
    is_primary           BIT           NULL,
    eff_date             DATE          NULL,
    exp_date             DATE          NULL,
    license_number       NVARCHAR(32)  NULL,
    license_type         VARCHAR(8)    NULL,
    service_type         NVARCHAR(MAX) NULL,  -- ';'-delimited
    telehealth_flag      CHAR(1)       NULL,
    accept_new           CHAR(1)       NULL,
    valid_flag           CHAR(1)       NULL,
    population_served_pd NVARCHAR(MAX) NULL,  -- ';'-delimited
    specialties_pd       NVARCHAR(MAX) NULL,  -- ';'-delimited
    snapshot_date        DATE          NOT NULL
);
