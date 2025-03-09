# Backend configuration for Terraform state management

# Using Google Cloud Storage for state with environment-specific prefixes
terraform {
  backend "gcs" {
    bucket      = "ai-agent-network-terraform-state"
    prefix      = "${var.environment}"
    credentials = "~/.config/gcloud/application_default_credentials.json"
  }
}

# State locking is automatically enabled with GCS backend