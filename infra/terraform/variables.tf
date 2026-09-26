variable "resource_group_name" {
  description = "Resource group for all project resources"
  type        = string
  default     = "oc-health-dba-ml"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "West US 2"
}

variable "sql_server_name" {
  description = "Logical SQL server name (must be globally unique)"
  type        = string
  default     = "oc-health-dba-ml"
}

variable "sql_db_name" {
  description = "Database name"
  type        = string
  default     = "ocbh_provider"
}

variable "storage_account_name" {
  description = "Storage account name (lowercase alphanumeric, globally unique)"
  type        = string
  default     = "ochdmraw"
}

variable "container_name" {
  description = "Blob container for raw provider JSON snapshots"
  type        = string
  default     = "raw-provider-json"
}

variable "entra_admin_object_id" {
  description = "Object ID of the Entra ID user/group set as the SQL Entra admin"
  type        = string
}

variable "github_actions_ip_ranges" {
  description = "GitHub-hosted Actions runner CIDR ranges (from https://api.github.com/meta -> actions). Refresh periodically; GitHub publishes updates."
  type        = list(string)
  default     = []
}
