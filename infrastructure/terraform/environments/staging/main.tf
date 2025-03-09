# -----------------------------------------------------------------------------
# Staging Environment Terraform Configuration
# -----------------------------------------------------------------------------
# This file defines environment-specific settings for the AI Agent Network
# staging environment, with appropriate scaling and monitoring configurations
# for pre-production validation.
# -----------------------------------------------------------------------------

# Required providers
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.80.0"
    }
    vercel = {
      source  = "vercel/vercel"
      version = "~> 0.15.0"
    }
  }
}

# Local values specific to the staging environment
locals {
  environment = "staging"
  common_tags = {
    project     = "ai-agent-network",
    environment = "staging",
    managed-by  = "terraform"
  }
  domain_name = "staging.aiagentnetwork.com"
}

# -----------------------------------------------------------------------------
# WebSocket Server Configuration - Staging Specific
# -----------------------------------------------------------------------------

# Create a Cloud Run service for the WebSocket server
# Using the format_resource_name function from main.tf for consistent naming
resource "google_cloud_run_service" "websocket_server" {
  name     = format_resource_name("ai-agent-network-websocket")
  location = var.region
  project  = var.project_id

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/ai-agent-network-websocket:${local.environment}-latest"
        
        resources {
          limits = {
            cpu    = "1000m"
            memory = "2Gi"
          }
        }
        
        # Environment variables for the WebSocket server
        env {
          name  = "REDIS_HOST"
          value = redis_host
        }
        
        env {
          name  = "REDIS_PORT"
          value = redis_port
        }
        
        env {
          name  = "ENVIRONMENT"
          value = local.environment
        }
        
        env {
          name  = "NODE_ENV"
          value = "production"
        }
        
        # WebSocket server configuration
        env {
          name  = "MAX_CONNECTIONS"
          value = "1000"
        }
        
        env {
          name  = "MESSAGE_SIZE_LIMIT"
          value = "64kb"
        }
        
        # Enable verbose logging for staging environment
        env {
          name  = "LOG_LEVEL"
          value = "debug"
        }
      }
      
      # Set container concurrency for WebSocket connections
      container_concurrency = 80
    }
    
    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale" = "2"  # Minimum 2 instances for high availability
        "autoscaling.knative.dev/maxScale" = "10" # Maximum 10 instances for staging
        "run.googleapis.com/vpc-access-connector" = "vpc-connector-${local.environment}"
        "run.googleapis.com/vpc-access-egress" = "private-ranges-only"
      }
      
      labels = local.common_tags
    }
  }
  
  traffic {
    percent         = 100
    latest_revision = true
  }
  
  # Connect to the VPC network
  metadata {
    annotations = {
      "run.googleapis.com/launch-stage" = "BETA"
      "run.googleapis.com/vpc-access-connector" = "vpc-connector-${local.environment}"
      "run.googleapis.com/vpc-access-egress" = "private-ranges-only"
    }
  }
  
  depends_on = [
    # Ensure VPC connector exists before creating the service
    google_vpc_access_connector.connector
  ]
}

# Create a VPC connector for private communication
resource "google_vpc_access_connector" "connector" {
  name          = "vpc-connector-${local.environment}"
  region        = var.region
  ip_cidr_range = "10.8.0.0/28"
  network       = vpc_network_id
  
  # Staging specific - smaller machine type than production
  machine_type  = "e2-standard-2"
  
  min_instances = 2
  max_instances = 5
}

# Allow unauthenticated access to the WebSocket server in staging
resource "google_cloud_run_service_iam_member" "websocket_server_public" {
  service  = google_cloud_run_service.websocket_server.name
  location = google_cloud_run_service.websocket_server.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# -----------------------------------------------------------------------------
# Frontend Deployment - Staging Specific
# -----------------------------------------------------------------------------

# Configure Vercel deployment for the frontend
resource "vercel_project" "frontend" {
  name      = "ai-agent-network-${local.environment}"
  framework = "nextjs"
  
  git_repository = {
    type = "github"
    repo = "organization/ai-agent-network"
  }
  
  # Environment variables specific to staging
  environment = [
    {
      key    = "NEXT_PUBLIC_WEBSOCKET_URL"
      value  = "wss://${google_cloud_run_service.websocket_server.status[0].url}"
      target = ["production", "preview"]
    },
    {
      key    = "NEXT_PUBLIC_ENVIRONMENT"
      value  = local.environment
      target = ["production", "preview"]
    },
    {
      key    = "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
      value  = var.firebase_project_id
      target = ["production", "preview"]
    },
    {
      key    = "NEXT_PUBLIC_DOMAIN"
      value  = local.domain_name
      target = ["production", "preview"]
    },
    {
      key    = "NEXT_PUBLIC_ENABLE_ANALYTICS"
      value  = "true"
      target = ["production"]
    },
    {
      key    = "NEXT_PUBLIC_LOG_LEVEL"
      value  = "debug"
      target = ["production", "preview"]
    }
  ]
}

# Configure custom domain for the frontend
resource "vercel_project_domain" "frontend_domain" {
  project_id = vercel_project.frontend.id
  domain     = local.domain_name
}

# -----------------------------------------------------------------------------
# Staging-specific Monitoring
# -----------------------------------------------------------------------------

# Create a staging environment overview dashboard
resource "google_monitoring_dashboard" "staging_overview" {
  dashboard_json = <<EOF
{
  "displayName": "Staging Environment Overview",
  "gridLayout": {
    "columns": "2",
    "widgets": [
      {
        "title": "WebSocket Server CPU Utilization",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"run.googleapis.com/container/cpu/utilization\" AND resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${google_cloud_run_service.websocket_server.name}\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_MEAN"
                  }
                }
              },
              "plotType": "LINE"
            }
          ]
        }
      },
      {
        "title": "WebSocket Server Memory Utilization",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"run.googleapis.com/container/memory/utilization\" AND resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${google_cloud_run_service.websocket_server.name}\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_MEAN"
                  }
                }
              },
              "plotType": "LINE"
            }
          ]
        }
      },
      {
        "title": "Active WebSocket Connections",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"custom.googleapis.com/websocket/active_connections\" AND resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${google_cloud_run_service.websocket_server.name}\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_SUM"
                  }
                }
              },
              "plotType": "LINE"
            }
          ]
        }
      },
      {
        "title": "WebSocket Message Rate",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"custom.googleapis.com/websocket/messages_per_second\" AND resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${google_cloud_run_service.websocket_server.name}\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_RATE"
                  }
                }
              },
              "plotType": "LINE"
            }
          ]
        }
      },
      {
        "title": "Frontend Page Load Time",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"custom.googleapis.com/frontend/page_load_time\" AND resource.type=\"global\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_PERCENTILE_99"
                  }
                }
              },
              "plotType": "LINE"
            }
          ]
        }
      },
      {
        "title": "Redis Memory Usage",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"redis.googleapis.com/instance/memory/usage_ratio\" AND resource.type=\"redis_instance\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_MEAN"
                  }
                }
              },
              "plotType": "LINE"
            }
          ]
        }
      }
    ]
  }
}
EOF

  project = var.project_id
}

# Create staging-specific alert policies
resource "google_monitoring_alert_policy" "staging_alerts" {
  display_name = "Staging Environment Alert Policy"
  project      = var.project_id
  combiner     = "OR"  # Any condition can trigger the alert
  
  # Alert condition for WebSocket server CPU utilization
  conditions {
    display_name = "WebSocket Server CPU High Utilization (Staging)"
    
    condition_threshold {
      filter     = "metric.type=\"run.googleapis.com/container/cpu/utilization\" AND resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${google_cloud_run_service.websocket_server.name}\""
      duration   = "300s"  # 5 minutes
      comparison = "COMPARISON_GT"
      threshold_value = 0.75  # 75% utilization for staging
      
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_MEAN"
      }
    }
  }
  
  # Alert condition for WebSocket error rate
  conditions {
    display_name = "WebSocket Error Rate (Staging)"
    
    condition_threshold {
      filter     = "metric.type=\"custom.googleapis.com/websocket/error_rate\" AND resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${google_cloud_run_service.websocket_server.name}\""
      duration   = "300s"  # 5 minutes
      comparison = "COMPARISON_GT"
      threshold_value = 0.05  # 5% error rate
      
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_MEAN"
      }
    }
  }
  
  # Set up notification channels
  notification_channels = [
    "projects/${var.project_id}/notificationChannels/staging-email-channel"
  ]
  
  # Documentation for the alert policy
  documentation {
    content   = "Staging environment alert for the AI Agent Network. This alert indicates that one or more metrics have crossed their threshold in the staging environment. Review the specific condition for details and check the logs for more information."
    mime_type = "text/markdown"
  }
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "frontend_url" {
  value       = "https://${vercel_project_domain.frontend_domain.domain}"
  description = "URL of the frontend application in the staging environment"
}

output "monitoring_dashboard_urls" {
  value = {
    "staging_overview" = "https://console.cloud.google.com/monitoring/dashboards/custom/${google_monitoring_dashboard.staging_overview.dashboard_id}?project=${var.project_id}",
    "websocket_server" = "https://console.cloud.google.com/run/detail/${var.region}/${google_cloud_run_service.websocket_server.name}/metrics?project=${var.project_id}"
  }
  description = "URLs for monitoring dashboards in the staging environment"
}