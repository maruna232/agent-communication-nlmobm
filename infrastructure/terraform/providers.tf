terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.80.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 4.80.0"
    }
    vercel = {
      source  = "vercel/vercel"
      version = "~> 0.15.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5.1"
    }
  }
  required_version = ">= 1.3.0"
}

# Configure the Google Cloud provider
provider "google" {
  project = var.project_id
  region  = var.region
}

# Configure the Google Cloud Beta provider for preview features
provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# Configure the Vercel provider for frontend hosting
provider "vercel" {
  api_token = var.vercel_api_token
  team      = var.vercel_team_id != "" ? var.vercel_team_id : null
}

# Configure the Random provider for generating unique identifiers
provider "random" {
  # No configuration needed for random provider
}