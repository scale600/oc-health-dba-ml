-- 00_reset.sql
-- Drop all tables in FK-safe order (fact/bridge first, then dimensions, then
-- staging) so the schema can be re-created idempotently.

IF OBJECT_ID('dbo.Fact_Provider_Site', 'U') IS NOT NULL DROP TABLE dbo.Fact_Provider_Site;
IF OBJECT_ID('dbo.Bridge_Provider_Specialty', 'U') IS NOT NULL DROP TABLE dbo.Bridge_Provider_Specialty;
IF OBJECT_ID('dbo.Bridge_Provider_Language', 'U') IS NOT NULL DROP TABLE dbo.Bridge_Provider_Language;
IF OBJECT_ID('dbo.Bridge_Provider_Taxonomy', 'U') IS NOT NULL DROP TABLE dbo.Bridge_Provider_Taxonomy;
IF OBJECT_ID('dbo.Bridge_Provider_Service', 'U') IS NOT NULL DROP TABLE dbo.Bridge_Provider_Service;
IF OBJECT_ID('dbo.Bridge_Provider_Population', 'U') IS NOT NULL DROP TABLE dbo.Bridge_Provider_Population;
IF OBJECT_ID('dbo.Bridge_Provider_CulturalCap', 'U') IS NOT NULL DROP TABLE dbo.Bridge_Provider_CulturalCap;

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

IF OBJECT_ID('dbo.Staging_Provider', 'U') IS NOT NULL DROP TABLE dbo.Staging_Provider;
IF OBJECT_ID('dbo.Staging_Site', 'U') IS NOT NULL DROP TABLE dbo.Staging_Site;
IF OBJECT_ID('dbo.Staging_ProviderSite', 'U') IS NOT NULL DROP TABLE dbo.Staging_ProviderSite;
