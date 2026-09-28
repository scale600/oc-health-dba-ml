-- 10_dim.sql
-- Dimension tables. Surrogate keys (*_key) are INT IDENTITY; business keys (*_id)
-- preserve the API id. Lookup dimensions are keyed by their natural code.

IF OBJECT_ID('dbo.Dim_Provider', 'U') IS NOT NULL DROP TABLE dbo.Dim_Provider;
IF OBJECT_ID('dbo.Dim_Site', 'U') IS NOT NULL DROP TABLE dbo.Dim_Site;
IF OBJECT_ID('dbo.Dim_Specialty', 'U') IS NOT NULL DROP TABLE dbo.Dim_Specialty;
IF OBJECT_ID('dbo.Dim_Service_Type', 'U') IS NOT NULL DROP TABLE dbo.Dim_Service_Type;
IF OBJECT_ID('dbo.Dim_Taxonomy', 'U') IS NOT NULL DROP TABLE dbo.Dim_Taxonomy;
IF OBJECT_ID('dbo.Dim_Language', 'U') IS NOT NULL DROP TABLE dbo.Dim_Language;
IF OBJECT_ID('dbo.Dim_Population_Served', 'U') IS NOT NULL DROP TABLE dbo.Dim_Population_Served;
IF OBJECT_ID('dbo.Dim_Gender', 'U') IS NOT NULL DROP TABLE dbo.Dim_Gender;
IF OBJECT_ID('dbo.Dim_Licensure_Type', 'U') IS NOT NULL DROP TABLE dbo.Dim_Licensure_Type;
IF OBJECT_ID('dbo.Dim_Date', 'U') IS NOT NULL DROP TABLE dbo.Dim_Date;

-- ===== Provider dimension (grain = one provider) =====
CREATE TABLE dbo.Dim_Provider (
    provider_key           INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    provider_id            INT           NOT NULL UNIQUE,
    first_name             NVARCHAR(100) NULL,
    middle_name            NVARCHAR(100) NULL,
    last_name              NVARCHAR(100) NULL,
    gender_code            VARCHAR(8)    NULL,
    npi                    CHAR(10)      NULL,
    english_fluency_flag   CHAR(1)       NULL,
    cultural_training_flag CHAR(1)       NULL,
    accepts_medicare_flag  CHAR(1)       NULL,
    accepts_chip_flag      CHAR(1)       NULL,
    tgi_training_flag      CHAR(1)       NULL
);

-- ===== Site dimension (grain = one location) =====
CREATE TABLE dbo.Dim_Site (
    site_key              INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    site_id               INT            NOT NULL UNIQUE,
    name                  NVARCHAR(200)  NULL,
    plan_type             VARCHAR(10)    NULL,
    npi2                  CHAR(10)       NULL,
    taxonomy_code         VARCHAR(32)    NULL,
    address1              NVARCHAR(200)  NULL,
    city                  NVARCHAR(100)  NULL,
    state                 CHAR(2)        NULL,
    zip_code              VARCHAR(10)    NULL,
    phone                 NVARCHAR(32)   NULL,
    website               NVARCHAR(256)  NULL,
    ada_compliant_flag    CHAR(1)        NULL,
    tdd_tty_flag          CHAR(1)        NULL,
    telehealth_avail_flag CHAR(1)        NULL,
    latitude              DECIMAL(9,6)   NULL,  -- geocoded (not in API)
    longitude             DECIMAL(9,6)   NULL,  -- geocoded (not in API)
    geo_point             GEOGRAPHY      NULL,  -- derived from lat/lng
    census_tract          NVARCHAR(16)   NULL,  -- geocoding enrichment (optional)
    county                NVARCHAR(64)   NULL
);

-- ===== Lookup dimensions (keyed by natural code) =====
CREATE TABLE dbo.Dim_Specialty (
    code        VARCHAR(16)   NOT NULL PRIMARY KEY,
    description NVARCHAR(200) NULL,
    ordinal     INT           NULL,
    enabled     CHAR(1)       NULL
);

CREATE TABLE dbo.Dim_Service_Type (
    code        VARCHAR(16)   NOT NULL PRIMARY KEY,
    description NVARCHAR(200) NULL,
    ordinal     INT           NULL,
    enabled     CHAR(1)       NULL
);

CREATE TABLE dbo.Dim_Taxonomy (
    code        VARCHAR(32)   NOT NULL PRIMARY KEY,
    description NVARCHAR(200) NULL,
    ordinal     INT           NULL,
    enabled     CHAR(1)       NULL
);

CREATE TABLE dbo.Dim_Language (
    code        VARCHAR(8)    NOT NULL PRIMARY KEY,
    description NVARCHAR(200) NULL,
    ordinal     INT           NULL,
    enabled     CHAR(1)       NULL
);

CREATE TABLE dbo.Dim_Population_Served (
    code        VARCHAR(16)   NOT NULL PRIMARY KEY,
    description NVARCHAR(200) NULL,
    ordinal     INT           NULL,
    enabled     CHAR(1)       NULL
);

CREATE TABLE dbo.Dim_Gender (
    code        VARCHAR(8)    NOT NULL PRIMARY KEY,
    description NVARCHAR(200) NULL,
    ordinal     INT           NULL,
    enabled     CHAR(1)       NULL
);

CREATE TABLE dbo.Dim_Licensure_Type (
    code        VARCHAR(16)   NOT NULL PRIMARY KEY,
    description NVARCHAR(200) NULL,
    ordinal     INT           NULL,
    enabled     CHAR(1)       NULL
);

CREATE TABLE dbo.Dim_Date (
    date_key    INT  NOT NULL PRIMARY KEY,  -- YYYYMMDD
    full_date   DATE NOT NULL UNIQUE,
    year        INT  NOT NULL,
    month       INT  NOT NULL,
    day         INT  NOT NULL,
    day_of_week INT  NOT NULL
);
