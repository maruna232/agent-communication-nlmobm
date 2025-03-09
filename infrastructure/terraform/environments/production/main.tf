# -----------------------------------------------------------------------------
# Production Environment Configuration for AI Agent Network
# This file defines production-specific infrastructure settings for the platform
# to ensure high availability, scalability, and robust monitoring
# -----------------------------------------------------------------------------

# Configure Terraform backend for production state management
terraform {
  backend "gcs" {
    bucket = "ai-agent-network-tf-state"
    prefix = "terraform/production"
  }
}

# Provider configuration for production environment
provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# Local variables for production environment
locals {
  environment = "production"
  common_tags = {
    project     = "ai-agent-network"
    environment = "production"
    managed-by  = "terraform"
  }
  domain_name = "aiagentnetwork.com"
  monitoring_notification_channels = [
    google_monitoring_notification_channel.email.id,
    google_monitoring_notification_channel.pagerduty.id
  ]
}

# WebSocket server module for production environment
module "websocket_server" {
  source = "../../modules/websocket-server"
  
  project_id        = var.project_id
  environment       = local.environment
  region            = var.region
  
  # Production-grade high availability configuration
  websocket_server_min_instances = 5 
  websocket_server_max_instances = 50
  websocket_server_cpu           = "2"
  websocket_server_memory        = "4Gi"
  redis_memory_size_gb           = 10
  
  # Enable multi-region deployment for global availability and fault tolerance
  multi_region_deployment = true
  additional_regions      = ["europe-west1", "asia-northeast1"]
  
  domain_name = local.domain_name
  container_concurrency = 120
  
  # Enhanced monitoring for production environment
  enable_monitoring        = true
  alert_notification_email = "ops-alerts@aiagentnetwork.com"
}

# Frontend module for production environment
module "frontend" {
  source = "../../modules/frontend"
  
  project_id         = var.project_id
  environment        = local.environment
  vercel_project_id  = var.vercel_project_id
  vercel_team_id     = var.vercel_team_id
  
  # API credentials
  firebase_project_id = var.firebase_project_id
  firebase_api_key    = var.firebase_api_key
  openai_api_key      = var.openai_api_key
  
  # Connect to the WebSocket server
  websocket_server_url = module.websocket_server.websocket_service_url
  
  domain_name = local.domain_name
  
  # Enhanced monitoring for production environment
  enable_monitoring        = true
  alert_notification_email = "ops-alerts@aiagentnetwork.com"
}

# Production environment overview dashboard
resource "google_monitoring_dashboard" "production_overview" {
  dashboard_json = <<EOF
{
  "displayName": "AI Agent Network - Production Environment Overview",
  "gridLayout": {
    "columns": 3,
    "widgets": [
      {
        "title": "WebSocket Server Status",
        "scorecard": {
          "timeSeriesQuery": {
            "timeSeriesFilter": {
              "filter": "metric.type=\"run.googleapis.com/container/uptime\" resource.type=\"cloud_run_revision\" resource.label.\"service_name\"=\"websocket-server-production\"",
              "aggregation": {
                "alignmentPeriod": "60s",
                "perSeriesAligner": "ALIGN_FRACTION_TRUE"
              }
            }
          },
          "thresholds": [
            { "value": 0, "color": "RED" },
            { "value": 0.9, "color": "YELLOW" },
            { "value": 0.99, "color": "GREEN" }
          ]
        }
      },
      {
        "title": "Active WebSocket Connections",
        "scorecard": {
          "timeSeriesQuery": {
            "timeSeriesFilter": {
              "filter": "metric.type=\"custom.googleapis.com/websocket/active_connections\" resource.type=\"cloud_run_revision\" resource.label.\"service_name\"=\"websocket-server-production\"",
              "aggregation": {
                "alignmentPeriod": "60s",
                "perSeriesAligner": "ALIGN_MEAN",
                "crossSeriesReducer": "REDUCE_SUM"
              }
            }
          }
        }
      },
      {
        "title": "WebSocket Error Rate",
        "scorecard": {
          "timeSeriesQuery": {
            "timeSeriesFilter": {
              "filter": "metric.type=\"custom.googleapis.com/websocket/error_rate\" resource.type=\"cloud_run_revision\" resource.label.\"service_name\"=\"websocket-server-production\"",
              "aggregation": {
                "alignmentPeriod": "60s",
                "perSeriesAligner": "ALIGN_MEAN"
              }
            }
          },
          "thresholds": [
            { "value": 0.05, "color": "RED" },
            { "value": 0.01, "color": "YELLOW" },
            { "value": 0, "color": "GREEN" }
          ]
        }
      },
      {
        "title": "Frontend Availability",
        "scorecard": {
          "timeSeriesQuery": {
            "timeSeriesFilter": {
              "filter": "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" resource.type=\"uptime_url\" metric.label.\"check_id\"=\"frontend-health-check-production\"",
              "aggregation": {
                "alignmentPeriod": "60s",
                "perSeriesAligner": "ALIGN_FRACTION_TRUE"
              }
            }
          },
          "thresholds": [
            { "value": 0, "color": "RED" },
            { "value": 0.9, "color": "YELLOW" },
            { "value": 0.99, "color": "GREEN" }
          ]
        }
      },
      {
        "title": "Redis Memory Usage",
        "scorecard": {
          "timeSeriesQuery": {
            "timeSeriesFilter": {
              "filter": "metric.type=\"redis.googleapis.com/instance/memory/usage_ratio\" resource.type=\"redis_instance\"",
              "aggregation": {
                "alignmentPeriod": "60s",
                "perSeriesAligner": "ALIGN_MEAN"
              }
            }
          },
          "thresholds": [
            { "value": 0.9, "color": "RED" },
            { "value": 0.7, "color": "YELLOW" },
            { "value": 0, "color": "GREEN" }
          ]
        }
      },
      {
        "title": "WebSocket Instance Count",
        "scorecard": {
          "timeSeriesQuery": {
            "timeSeriesFilter": {
              "filter": "metric.type=\"run.googleapis.com/container/instance_count\" resource.type=\"cloud_run_revision\" resource.label.\"service_name\"=\"websocket-server-production\"",
              "aggregation": {
                "alignmentPeriod": "60s",
                "perSeriesAligner": "ALIGN_MEAN",
                "crossSeriesReducer": "REDUCE_SUM"
              }
            }
          }
        }
      }
    ]
  }
}
EOF

  project = var.project_id
}

# Critical system health alert policy
resource "google_monitoring_alert_policy" "system_health" {
  display_name = "Production Critical System Health"
  project      = var.project_id
  combiner     = "OR"
  
  conditions {
    display_name = "High Error Rate"
    
    condition_threshold {
      filter          = "metric.type=\"custom.googleapis.com/websocket/error_rate\" resource.type=\"cloud_run_revision\" resource.label.\"service_name\"=\"websocket-server-production\""
      duration        = "60s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.05
      
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_MEAN"
      }
    }
  }
  
  conditions {
    display_name = "WebSocket Server High Latency"
    
    condition_threshold {
      filter          = "metric.type=\"custom.googleapis.com/websocket/message_latency\" resource.type=\"cloud_run_revision\" resource.label.\"service_name\"=\"websocket-server-production\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 500
      
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_PERCENTILE_95"
        cross_series_reducer = "REDUCE_MEAN"
      }
    }
  }
  
  notification_channels = local.monitoring_notification_channels
}

# Email notification channel for alerts
resource "google_monitoring_notification_channel" "email" {
  display_name = "Production Email Notifications"
  project      = var.project_id
  type         = "email"
  
  labels = {
    email_address = "ops-alerts@aiagentnetwork.com"
  }
}

# PagerDuty notification channel for critical alerts
resource "google_monitoring_notification_channel" "pagerduty" {
  display_name = "Production PagerDuty Notifications"
  project      = var.project_id
  type         = "pagerduty"
  
  labels = {
    service_key = var.pagerduty_service_key
  }
}

# Uptime check for production services
resource "google_monitoring_uptime_check_config" "production_services" {
  display_name = "Production API Health Check"
  project      = var.project_id
  timeout      = "10s"
  period       = "60s"
  
  http_check {
    path         = "/health"
    port         = 443
    use_ssl      = true
    validate_ssl = true
  }
  
  monitored_resource {
    type = "uptime_url"
    labels = {
      host       = "websocket.${local.domain_name}"
      project_id = var.project_id
    }
  }
}

# Custom logging metrics for production monitoring
resource "google_logging_metric" "websocket_errors" {
  name        = "websocket-server-errors"
  filter      = "resource.type=\"cloud_run_revision\" resource.labels.service_name=\"websocket-server-production\" severity>=ERROR"
  description = "Count of WebSocket server errors in production"
  
  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    unit        = "1"
    labels {
      key         = "error_type"
      value_type  = "STRING"
      description = "Type of error"
    }
  }
  
  value_extractor = "EXTRACT(jsonPayload.errorType)"
}

# Outputs for production environment
output "frontend_url" {
  value       = module.frontend.frontend_url
  description = "URL of the frontend application in the production environment"
}

output "websocket_url" {
  value       = module.websocket_server.websocket_service_url
  description = "URL of the WebSocket server for agent-to-agent communication"
}

output "monitoring_dashboard_urls" {
  value = {
    "overview"         = "https://console.cloud.google.com/monitoring/dashboards/custom/${google_monitoring_dashboard.production_overview.id}?project=${var.project_id}",
    "websocket_server" = module.websocket_server.monitoring_dashboard_url,
    "frontend"         = module.frontend.monitoring_dashboard_url
  }
  description = "URLs for monitoring dashboards in the production environment"
}