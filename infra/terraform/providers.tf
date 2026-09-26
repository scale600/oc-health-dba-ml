terraform {
  required_version = ">= 1.5"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    azapi = {
      source  = "Azure/azapi"
      version = "~> 1.15"
    }
  }
}

provider "azurerm" {
  features {}
  # Auth via environment (ARM_SUBSCRIPTION_ID / ARM_TENANT_ID) or `az login`.
  # Do NOT hardcode credentials in this file.
}

provider "azapi" {}
