# Infrastructure configuration for AI Agent Network - Development Environment
# This file defines the development environment infrastructure with privacy-focused architecture

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
  required_version = ">= 1.0.0"
}

# Local variables for development environment
locals {
  environment = "dev"
  common_tags = {
    project     = "ai-agent-network"
    environment = local.environment
    managed-by  = "terraform"
  }
}

# Provider configurations
provider "google" {
  project = var.project_id
  region  = var.region
}

provider "vercel" {
  api_token = var.vercel_api_token
  team      = var.vercel_team_id != "" ? var.vercel_team_id : null
}

# Enable required Google Cloud APIs for the development environment
resource "google_project_service" "gcp_services" {
  for_each = toset([
    "run.googleapis.com",                # Cloud Run API
    "compute.googleapis.com",            # Compute Engine API
    "monitoring.googleapis.com",         # Cloud Monitoring API
    "logging.googleapis.com",            # Cloud Logging API
    "redis.googleapis.com",              # Redis API
    "cloudbuild.googleapis.com",         # Cloud Build API
    "containerregistry.googleapis.com",  # Container Registry API
    "secretmanager.googleapis.com",      # Secret Manager API
    "cloudresourcemanager.googleapis.com" # Resource Manager API
  ])
  
  project = var.project_id
  service = each.key
  
  disable_on_destroy = false
}

# Development environment monitoring dashboard
resource "google_monitoring_dashboard" "dev_dashboard" {
  dashboard_json = <<EOF
{
  "displayName": "AI Agent Network - Development Environment",
  "gridLayout": {
    "widgets": [
      {
        "title": "WebSocket Server CPU Usage",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"websocket-server-dev\" AND metric.type=\"run.googleapis.com/container/cpu/utilization\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_MEAN"
                  }
                }
              }
            }
          ],
          "yAxis": {
            "label": "CPU Utilization",
            "scale": "LINEAR"
          }
        }
      },
      {
        "title": "WebSocket Server Memory Usage",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"websocket-server-dev\" AND metric.type=\"run.googleapis.com/container/memory/utilization\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_MEAN"
                  }
                }
              }
            }
          ],
          "yAxis": {
            "label": "Memory Utilization",
            "scale": "LINEAR"
          }
        }
      },
      {
        "title": "WebSocket Server Request Count",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"websocket-server-dev\" AND metric.type=\"run.googleapis.com/request_count\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_RATE"
                  }
                }
              }
            }
          ],
          "yAxis": {
            "label": "Requests per second",
            "scale": "LINEAR"
          }
        }
      },
      {
        "title": "WebSocket Server Latency",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"websocket-server-dev\" AND metric.type=\"run.googleapis.com/request_latencies\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_MEAN"
                  }
                }
              }
            }
          ],
          "yAxis": {
            "label": "Latency (ms)",
            "scale": "LINEAR"
          }
        }
      },
      {
        "title": "Redis Memory Usage",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"redis_instance\" AND resource.labels.instance_id=\"websocket-redis-dev\" AND metric.type=\"redis.googleapis.com/stats/memory/usage\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_MEAN"
                  }
                }
              }
            }
          ],
          "yAxis": {
            "label": "Memory Usage (bytes)",
            "scale": "LINEAR"
          }
        }
      },
      {
        "title": "Client-side Performance",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"custom.googleapis.com/client/page_load_time\"",
                  "aggregation": {
                    "alignmentPeriod": "300s",
                    "perSeriesAligner": "ALIGN_PERCENTILE_95"
                  }
                }
              }
            }
          ],
          "yAxis": {
            "label": "Page Load Time (ms)",
            "scale": "LINEAR"
          }
        }
      }
    ]
  }
}
EOF

  project = var.project_id

  depends_on = [google_project_service.gcp_services]
}

# Use the development cloud run module to create the WebSocket server
module "websocket_server" {
  source = "../../modules/cloud_run"
  
  environment             = local.environment
  project_id              = var.project_id
  region                  = var.region
  service_name            = "websocket-server"
  container_image         = "gcr.io/${var.project_id}/websocket-server:latest"
  cpu                     = "1"
  memory                  = "512Mi"  # Reduced for development environment
  min_instances           = 1        # Minimal instance count for development
  max_instances           = 3        # Limited scaling for development
  container_concurrency   = var.container_concurrency
  timeout_seconds         = 300
  vpc_connector           = null     # No VPC connector needed in development
  allow_public_access     = true     # Public access for easier development
  
  environment_variables = {
    ENVIRONMENT  = local.environment
    REDIS_HOST   = module.redis.host
    REDIS_PORT   = module.redis.port
    LOG_LEVEL    = "debug"           # More verbose logging for development
  }
  
  tags = local.common_tags
  
  depends_on = [google_project_service.gcp_services]
}

# Use the development redis module for lightweight message broker
module "redis" {
  source = "../../modules/redis"
  
  environment       = local.environment
  project_id        = var.project_id
  region            = var.region
  memory_size_gb    = 1  # Minimal size for development
  tier              = "BASIC"  # Cost-optimized setting for development
  
  tags = local.common_tags
  
  depends_on = [google_project_service.gcp_services]
}