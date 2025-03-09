# Infrastructure for AI Agent Network Frontend Deployment
# This module manages the Vercel deployment of the Next.js frontend application

terraform {
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 0.15.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 4.80.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5.1"
    }
  }
}

# Local variables for naming conventions and environment-specific configurations
locals {
  project_name  = "ai-agent-network"
  frontend_name = "frontend-${var.environment}"
  
  # Domain configuration: for production, use the bare domain; for other environments, use a prefix
  domain_prefix = "${var.environment == "production" ? "" : "${var.environment}."}"
  frontend_domain = "${local.domain_prefix}${var.domain_name}"
  
  # Common tags for resources
  common_tags = {
    project     = "ai-agent-network"
    component   = "frontend"
    environment = "${var.environment}"
    managed-by  = "terraform"
  }
  
  # Environment variables for the Next.js application
  env_variables = {
    NEXT_PUBLIC_FIREBASE_PROJECT_ID = "${var.firebase_project_id}"
    NEXT_PUBLIC_FIREBASE_API_KEY    = "${var.firebase_api_key}"
    NEXT_PUBLIC_WEBSOCKET_URL       = "${var.websocket_server_url}"
    NEXT_PUBLIC_ENVIRONMENT         = "${var.environment}"
    OPENAI_API_KEY                  = "${var.openai_api_key}"
  }
}

# Vercel project for the Next.js frontend application
resource "vercel_project" "frontend" {
  name           = local.frontend_name
  framework      = "nextjs"
  team_id        = var.vercel_team_id != "" ? var.vercel_team_id : null
  
  git_repository = {
    type              = "github"
    repo              = "organization/ai-agent-network"
    production_branch = var.environment == "production" ? "main" : var.environment
  }
  
  build_command   = "npm run build"
  dev_command     = "npm run dev"
  root_directory  = "src/web"
  
  # Environment variables for the Vercel project
  environment = [
    {
      key     = "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
      value   = var.firebase_project_id
      target  = ["production", "preview", "development"]
    },
    {
      key     = "NEXT_PUBLIC_FIREBASE_API_KEY"
      value   = var.firebase_api_key
      target  = ["production", "preview", "development"]
    },
    {
      key     = "NEXT_PUBLIC_WEBSOCKET_URL"
      value   = var.websocket_server_url
      target  = ["production", "preview", "development"]
    },
    {
      key     = "NEXT_PUBLIC_ENVIRONMENT"
      value   = var.environment
      target  = ["production", "preview", "development"]
    },
    {
      key     = "OPENAI_API_KEY"
      value   = var.openai_api_key
      target  = ["production", "preview", "development"]
    }
  ]
}

# Vercel deployment for the frontend application
resource "vercel_deployment" "frontend_deployment" {
  project_id  = vercel_project.frontend.id
  production  = var.environment == "production" ? true : false
  files       = []  # Using Git deployment, so no files are specified here
  path_prefix = "src/web"
  
  environment = [
    {
      key   = "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
      value = var.firebase_project_id
    },
    {
      key   = "NEXT_PUBLIC_FIREBASE_API_KEY"
      value = var.firebase_api_key
    },
    {
      key   = "NEXT_PUBLIC_WEBSOCKET_URL"
      value = var.websocket_server_url
    },
    {
      key   = "NEXT_PUBLIC_ENVIRONMENT"
      value = var.environment
    },
    {
      key   = "OPENAI_API_KEY"
      value = var.openai_api_key
    }
  ]
}

# Custom domain for the frontend application
resource "vercel_domain" "frontend_domain" {
  project_id = vercel_project.frontend.id
  domain     = local.frontend_domain
  git_branch = var.environment == "production" ? "main" : var.environment
}

# Google monitoring dashboard for frontend metrics
resource "google_monitoring_dashboard" "frontend_dashboard" {
  count = var.enable_monitoring ? 1 : 0
  
  dashboard_json = <<EOF
{
  "displayName": "Frontend Metrics Dashboard",
  "gridLayout": {
    "columns": 2,
    "widgets": []
  }
}
EOF
  
  project = var.project_id
}

# Email notification channel for frontend alerts
resource "google_monitoring_notification_channel" "frontend_email" {
  count = var.enable_monitoring ? 1 : 0
  
  display_name = "Frontend Email Notifications - ${title(var.environment)}"
  type         = "email"
  
  labels = {
    email_address = var.alert_notification_email
  }
  
  project = var.project_id
}

# Alert policy for frontend error rate
resource "google_monitoring_alert_policy" "frontend_error_rate" {
  count = var.enable_monitoring ? 1 : 0
  
  display_name = "Frontend Error Rate - ${title(var.environment)}"
  project      = var.project_id
  combiner     = "OR"
  
  conditions {
    display_name = "Error rate > 1%"
    
    condition_threshold {
      filter          = "metric.type=\"custom.googleapis.com/frontend/error_rate\" resource.type=\"global\""
      duration        = "60s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.01
      
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
      }
    }
  }
  
  notification_channels = [
    google_monitoring_notification_channel.frontend_email[0].name
  ]
}

# Alert policy for frontend performance
resource "google_monitoring_alert_policy" "frontend_performance" {
  count = var.enable_monitoring ? 1 : 0
  
  display_name = "Frontend Performance - ${title(var.environment)}"
  project      = var.project_id
  combiner     = "OR"
  
  conditions {
    display_name = "Page load time > 3s"
    
    condition_threshold {
      filter          = "metric.type=\"custom.googleapis.com/frontend/page_load_time\" resource.type=\"global\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 3.0
      
      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_PERCENTILE_99"
        cross_series_reducer = "REDUCE_MEAN"
      }
    }
  }
  
  notification_channels = [
    google_monitoring_notification_channel.frontend_email[0].name
  ]
}

# Uptime check for frontend application
resource "google_monitoring_uptime_check_config" "frontend_health_check" {
  count = var.enable_monitoring ? 1 : 0
  
  display_name = "Frontend Health Check - ${title(var.environment)}"
  project      = var.project_id
  timeout      = "10s"
  period       = "60s"
  
  http_check {
    path         = "/api/health"
    port         = 443
    use_ssl      = true
    validate_ssl = true
  }
  
  monitored_resource {
    type = "uptime_url"
    labels = {
      host       = local.frontend_domain
      project_id = var.project_id
    }
  }
}

# Secret for storing frontend environment variables
resource "google_secret_manager_secret" "frontend_env_vars" {
  secret_id = "frontend-env-vars-${var.environment}"
  project   = var.project_id
  
  replication {
    automatic = true
  }
  
  labels = local.common_tags
}

# Version of the frontend environment variables secret
resource "google_secret_manager_secret_version" "frontend_env_vars" {
  secret      = google_secret_manager_secret.frontend_env_vars.id
  secret_data = jsonencode(local.env_variables)
}

# Outputs
output "frontend_url" {
  value       = vercel_deployment.frontend_deployment.url
  description = "URL of the deployed frontend application"
}

output "vercel_deployment_id" {
  value       = vercel_deployment.frontend_deployment.id
  description = "Deployment ID of the Vercel project"
}

output "frontend_domain" {
  value       = vercel_domain.frontend_domain.domain
  description = "Custom domain for the frontend application"
}

output "vercel_project_name" {
  value       = vercel_project.frontend.name
  description = "Name of the Vercel project for the frontend application"
}

output "monitoring_dashboard_url" {
  value       = var.enable_monitoring ? "https://console.cloud.google.com/monitoring/dashboards/builder/${google_monitoring_dashboard.frontend_dashboard[0].id}?project=${var.project_id}" : ""
  description = "URL of the frontend monitoring dashboard"
}