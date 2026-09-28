# Azure resources for the OC BH provider pipeline.
# Azure SQL Database (free offer via azapi) + Blob Storage + firewall.

resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location
}

# --- Azure SQL logical server ---
resource "azurerm_mssql_server" "server" {
  name                          = var.sql_server_name
  resource_group_name           = azurerm_resource_group.rg.name
  location                      = azurerm_resource_group.rg.location
  version                       = "12.0"
  minimum_tls_version           = "1.2"
  public_network_access_enabled = true # GitHub-hosted runners reach it over the public endpoint

  azuread_administrator {
    login_username              = "sqladmin"
    object_id                   = var.entra_admin_object_id
    azuread_authentication_only = true # Entra ID only — no SQL-auth password
  }
}

# --- Database via azapi (free-offer preview properties) ---
# `useFreeLimit` / `freeLimitExhaustionBehavior` are NOT exposed by azurerm_mssql_database,
# so the database is created through the Microsoft.Sql preview API.
resource "azapi_resource" "sql_db" {
  type                      = "Microsoft.Sql/servers/databases@2024-11-01-preview"
  name                      = var.sql_db_name
  parent_id                 = azurerm_mssql_server.server.id
  schema_validation_enabled = false # preview API has useFreeLimit, not yet in azapi's embedded schema

  body = jsonencode({
    location = azurerm_resource_group.rg.location
    sku = {
      name     = "GP_S_Gen5"
      tier     = "GeneralPurpose"
      family   = "Gen5"
      capacity = 2
    }
    properties = {
      collation                        = "SQL_Latin1_General_CP1_CI_AS"
      maxSizeBytes                     = 34359738368 # 32 GB
      catalogCollation                 = "SQL_Latin1_General_CP1_CI_AS"
      zoneRedundant                    = false
      readScale                        = "Disabled"
      autoPauseDelay                   = 60 # minutes
      requestedBackupStorageRedundancy = "Local"
      minCapacity                      = 0.5
      isLedgerOn                       = false
      useFreeLimit                     = true
      freeLimitExhaustionBehavior      = "AutoPause"
    }
  })
}

# --- SQL firewall: GitHub-hosted Actions runner IP ranges ---
resource "azurerm_mssql_firewall_rule" "github_actions" {
  count            = length(var.github_actions_ip_ranges)
  name             = "gh-actions-${count.index}"
  server_id        = azurerm_mssql_server.server.id
  start_ip_address = cidrhost(var.github_actions_ip_ranges[count.index], 0)
  end_ip_address   = cidrhost(var.github_actions_ip_ranges[count.index], -1)
}

# --- Blob Storage for raw JSON snapshots ---
resource "azurerm_storage_account" "raw" {
  name                     = var.storage_account_name
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"
}

resource "azurerm_storage_container" "raw_json" {
  name                  = var.container_name
  storage_account_id    = azurerm_storage_account.raw.id
  container_access_type = "private"
}

# --- Azure Static Web Apps (free tier) — serves the React dashboard ---
resource "azurerm_static_web_app" "dashboard" {
  name                = "oc-health-dba-ml"
  resource_group_name = azurerm_resource_group.rg.name
  location            = var.location
  sku_tier            = "Free"
  sku_size            = "Free"
}

# --- Outputs ---
output "sql_server_fqdn" {
  description = "Fully-qualified domain name of the logical SQL server"
  value       = azurerm_mssql_server.server.fully_qualified_domain_name
}

output "sql_db_id" {
  description = "Resource ID of the provisioned database"
  value       = azapi_resource.sql_db.id
}

output "storage_account_name" {
  value = azurerm_storage_account.raw.name
}

output "storage_container_name" {
  value = azurerm_storage_container.raw_json.name
}

output "static_web_app_url" {
  description = "Default hostname of the Static Web App"
  value       = azurerm_static_web_app.dashboard.default_host_name
}
