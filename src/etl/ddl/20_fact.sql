-- 20_fact.sql
-- Fact table (M:N provider<->site bridge) + ';'-delimited junction tables.

IF OBJECT_ID('dbo.Fact_Provider_Site', 'U') IS NOT NULL DROP TABLE dbo.Fact_Provider_Site;
IF OBJECT_ID('dbo.Bridge_Provider_Specialty', 'U') IS NOT NULL DROP TABLE dbo.Bridge_Provider_Specialty;
IF OBJECT_ID('dbo.Bridge_Provider_Language', 'U') IS NOT NULL DROP TABLE dbo.Bridge_Provider_Language;
IF OBJECT_ID('dbo.Bridge_Provider_Taxonomy', 'U') IS NOT NULL DROP TABLE dbo.Bridge_Provider_Taxonomy;
IF OBJECT_ID('dbo.Bridge_Provider_Service', 'U') IS NOT NULL DROP TABLE dbo.Bridge_Provider_Service;
IF OBJECT_ID('dbo.Bridge_Provider_Population', 'U') IS NOT NULL DROP TABLE dbo.Bridge_Provider_Population;
IF OBJECT_ID('dbo.Bridge_Provider_CulturalCap', 'U') IS NOT NULL DROP TABLE dbo.Bridge_Provider_CulturalCap;

-- ===== Fact: one provider at one site (the M:N bridge) =====
CREATE TABLE dbo.Fact_Provider_Site (
    provider_site_key           INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    provider_key                INT  NOT NULL,
    site_key                    INT  NOT NULL,
    is_primary_flag             BIT  NULL,
    eff_date                    DATE NULL,
    exp_date                    DATE NULL,
    license_number              NVARCHAR(32) NULL,
    license_type_code           VARCHAR(8)   NULL,
    telehealth_flag             CHAR(1)      NULL,
    accepting_new_patients_flag CHAR(1)      NULL,
    valid_flag                  CHAR(1)      NULL,
    snapshot_date               DATE NOT NULL,
    CONSTRAINT FK_FactProviderSite_Provider
        FOREIGN KEY (provider_key) REFERENCES dbo.Dim_Provider (provider_key),
    CONSTRAINT FK_FactProviderSite_Site
        FOREIGN KEY (site_key) REFERENCES dbo.Dim_Site (site_key)
);

-- ===== Junction tables (M:N normalization of ';' fields) =====
CREATE TABLE dbo.Bridge_Provider_Specialty (
    provider_id    INT         NOT NULL,
    specialty_code VARCHAR(16) NOT NULL,
    CONSTRAINT PK_BridgeProviderSpecialty PRIMARY KEY (provider_id, specialty_code)
);

CREATE TABLE dbo.Bridge_Provider_Language (
    provider_id   INT        NOT NULL,
    language_code VARCHAR(8) NOT NULL,
    fluency       CHAR(1)    NULL,
    CONSTRAINT PK_BridgeProviderLanguage PRIMARY KEY (provider_id, language_code)
);

CREATE TABLE dbo.Bridge_Provider_Taxonomy (
    provider_id   INT         NOT NULL,
    taxonomy_code VARCHAR(32) NOT NULL,
    CONSTRAINT PK_BridgeProviderTaxonomy PRIMARY KEY (provider_id, taxonomy_code)
);

CREATE TABLE dbo.Bridge_Provider_Service (
    provider_id  INT         NOT NULL,
    service_code VARCHAR(16) NOT NULL,
    CONSTRAINT PK_BridgeProviderService PRIMARY KEY (provider_id, service_code)
);

CREATE TABLE dbo.Bridge_Provider_Population (
    provider_id     INT         NOT NULL,
    population_code VARCHAR(16) NOT NULL,
    CONSTRAINT PK_BridgeProviderPopulation PRIMARY KEY (provider_id, population_code)
);

CREATE TABLE dbo.Bridge_Provider_CulturalCap (
    provider_id INT         NOT NULL,
    cap_code    VARCHAR(16) NOT NULL,
    CONSTRAINT PK_BridgeProviderCulturalCap PRIMARY KEY (provider_id, cap_code)
);
