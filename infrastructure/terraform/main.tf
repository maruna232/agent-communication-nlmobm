# -----------------------------------------------------------------------------
# Main Terraform configuration file for the AI Agent Network platform
# This file defines the core infrastructure resources for the platform, 
# including networking, Redis for pub/sub, and monitoring components.
# -----------------------------------------------------------------------------

# Local values for resource naming and tagging
locals {
  project_name = "ai-agent-network"
  common_tags = {
    project     = "ai-agent-network"
    environment = var.environment
    managed-by  = "terraform"
  }
  monitoring_notification_channels = [
    google_monitoring_notification_channel.email.id
  ]
}

# Helper function to format resource names consistently with environment suffix
locals {
  format_resource_name = function(resource_name) {
    return "${resource_name}-${var.environment}"
  }
}

# -----------------------------------------------------------------------------
# API Enablement
# -----------------------------------------------------------------------------

# Enable required Google Cloud APIs for the project
resource "google_project_service" "required_apis" {
  project = var.project_id
  for_each = toset([
    "compute.googleapis.com",           # Compute Engine API for networking and VMs
    "redis.googleapis.com",             # Redis API for pub/sub communication
    "secretmanager.googleapis.com",     # Secret Manager API for sensitive data
    "monitoring.googleapis.com",        # Cloud Monitoring API for observability
    "cloudresourcemanager.googleapis.com", # Resource Manager API for project resources
    "iam.googleapis.com",               # Identity and Access Management API
    "run.googleapis.com",               # Cloud Run API for containerized services
    "artifactregistry.googleapis.com",  # Artifact Registry API for container images
    "cloudbuild.googleapis.com",        # Cloud Build API for CI/CD
    "containerregistry.googleapis.com", # Container Registry API for Docker images
    "logging.googleapis.com",           # Cloud Logging API for centralized logs
  ])
  service = each.key

  # Don't disable services when making changes to avoid disruption
  disable_dependent_services = false
  disable_on_destroy         = false
}

# -----------------------------------------------------------------------------
# Networking Resources
# -----------------------------------------------------------------------------

# Create a VPC network for secure communication between services
resource "google_compute_network" "vpc_network" {
  name                    = local.format_resource_name("${local.project_name}-network")
  project                 = var.project_id
  auto_create_subnetworks = true  # Automatically create subnets in each region for multi-region deployment
  description             = "VPC network for the AI Agent Network platform"

  depends_on = [google_project_service.required_apis]
}

# Reserve a global IP address for the WebSocket server load balancer
resource "google_compute_global_address" "websocket_lb_ip" {
  name        = local.format_resource_name("${local.project_name}-websocket-lb-ip")
  project     = var.project_id
  description = "Global IP address for WebSocket server load balancer"

  depends_on = [google_project_service.required_apis]
}

# -----------------------------------------------------------------------------
# Redis Instance for WebSocket Pub/Sub
# -----------------------------------------------------------------------------

# Create a Redis instance for pub/sub communication between WebSocket servers
# This allows WebSocket servers to share connection state and messages across instances
resource "google_redis_instance" "websocket_pubsub" {
  name           = local.format_resource_name("${local.project_name}-redis")
  project        = var.project_id
  region         = var.region
  memory_size_gb = var.redis_memory_size_gb
  
  # Use HA tier for production reliability
  # For dev and staging, we could use a conditional to select BASIC tier instead
  tier           = var.environment == "production" ? "STANDARD_HA" : "BASIC"
  redis_version  = "REDIS_6_X"
  
  display_name               = "WebSocket Pub/Sub Redis"
  authorized_network         = google_compute_network.vpc_network.id
  
  # Redis configuration optimized for pub/sub messaging
  redis_configs = {
    "maxmemory-policy" = "allkeys-lru"     # Evict least recently used keys when memory is full
    "notify-keyspace-events" = "Ex"         # Enable keyspace notifications for pub/sub
    "timeout" = "30"                        # Connection timeout in seconds
  }
  
  labels = local.common_tags

  depends_on = [
    google_project_service.required_apis,
    google_compute_network.vpc_network
  ]
}

# For multi-region deployment, create Redis instances in additional regions
# This enables lower latency for users in different geographic regions
resource "google_redis_instance" "websocket_pubsub_additional_regions" {
  for_each = var.multi_region_deployment ? toset(var.additional_regions) : []
  
  name           = local.format_resource_name("${local.project_name}-redis-${each.key}")
  project        = var.project_id
  region         = each.key
  memory_size_gb = var.redis_memory_size_gb
  
  # Use simpler tier for non-production environments
  tier           = var.environment == "production" ? "STANDARD_HA" : "BASIC"
  redis_version  = "REDIS_6_X"
  
  display_name               = "WebSocket Pub/Sub Redis (${each.key})"
  authorized_network         = google_compute_network.vpc_network.id
  
  redis_configs = {
    "maxmemory-policy" = "allkeys-lru"
    "notify-keyspace-events" = "Ex"
    "timeout" = "30"
  }
  
  labels = local.common_tags

  depends_on = [
    google_project_service.required_apis,
    google_compute_network.vpc_network
  ]
}

# -----------------------------------------------------------------------------
# Secret Management
# -----------------------------------------------------------------------------

# Create a secret for the OpenAI API key
# This keeps sensitive credentials out of application code and configuration
resource "google_secret_manager_secret" "openai_api_key" {
  secret_id = "${local.project_name}-openai-api-key-${var.environment}"
  project   = var.project_id
  
  replication {
    automatic = true  # Automatically replicate to available regions
  }
  
  labels = local.common_tags

  depends_on = [google_project_service.required_apis]
}

# Store the actual API key value in the secret
resource "google_secret_manager_secret_version" "openai_api_key_version" {
  secret      = google_secret_manager_secret.openai_api_key.id
  secret_data = var.openai_api_key
}

# Create a secret for the Firebase API key
resource "google_secret_manager_secret" "firebase_api_key" {
  secret_id = "${local.project_name}-firebase-api-key-${var.environment}"
  project   = var.project_id
  
  replication {
    automatic = true
  }
  
  labels = local.common_tags

  depends_on = [google_project_service.required_apis]
}

# Store the actual Firebase API key value in the secret
resource "google_secret_manager_secret_version" "firebase_api_key_version" {
  secret      = google_secret_manager_secret.firebase_api_key.id
  secret_data = var.firebase_api_key
}

# -----------------------------------------------------------------------------
# Monitoring and Alerting
# -----------------------------------------------------------------------------

# Create an email notification channel for monitoring alerts
resource "google_monitoring_notification_channel" "email" {
  display_name = "Email Notification Channel - ${var.environment}"
  project      = var.project_id
  type         = "email"
  
  labels = {
    email_address = var.alert_notification_email
  }
  
  depends_on = [google_project_service.required_apis]
}

# Create a monitoring dashboard for WebSocket server metrics
resource "google_monitoring_dashboard" "websocket_server_dashboard" {
  dashboard_json = <<EOF
{
  "displayName": "WebSocket Server Dashboard - ${var.environment}",
  "gridLayout": {
    "columns": "2",
    "widgets": [
      {
        "title": "CPU Utilization",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"run.googleapis.com/container/cpu/utilization\" AND resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${local.format_resource_name("${local.project_name}-websocket")}\"",
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
        "title": "Memory Utilization",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"run.googleapis.com/container/memory/utilization\" AND resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${local.format_resource_name("${local.project_name}-websocket")}\"",
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
        "title": "Active Connections",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"custom.googleapis.com/websocket/active_connections\" AND resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${local.format_resource_name("${local.project_name}-websocket")}\"",
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
        "title": "Message Throughput",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"custom.googleapis.com/websocket/messages_per_second\" AND resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${local.format_resource_name("${local.project_name}-websocket")}\"",
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
        "title": "Error Rate",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"custom.googleapis.com/websocket/error_rate\" AND resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${local.format_resource_name("${local.project_name}-websocket")}\"",
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
        "title": "Instance Count",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"run.googleapis.com/container/instance_count\" AND resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${local.format_resource_name("${local.project_name}-websocket")}\"",
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
      }
    ]
  }
}
EOF

  project = var.project_id

  depends_on = [google_project_service.required_apis]
}

# Create a system health dashboard for overall infrastructure health
resource "google_monitoring_dashboard" "system_health_dashboard" {
  dashboard_json = <<EOF
{
  "displayName": "System Health Dashboard - ${var.environment}",
  "gridLayout": {
    "columns": "2",
    "widgets": [
      {
        "title": "Redis CPU Utilization",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"redis.googleapis.com/instance/cpu/utilization\" AND resource.type=\"redis_instance\" AND resource.labels.instance_id=\"${google_redis_instance.websocket_pubsub.instance_id}\"",
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
        "title": "Redis Memory Usage",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"redis.googleapis.com/instance/memory/usage_ratio\" AND resource.type=\"redis_instance\" AND resource.labels.instance_id=\"${google_redis_instance.websocket_pubsub.instance_id}\"",
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
        "title": "Redis Connected Clients",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"redis.googleapis.com/clients/connected\" AND resource.type=\"redis_instance\" AND resource.labels.instance_id=\"${google_redis_instance.websocket_pubsub.instance_id}\"",
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
        "title": "Network Egress",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"networking.googleapis.com/vm_flow/egress_bytes_count\" AND resource.type=\"gce_instance\"",
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
      }
    ]
  }
}
EOF

  project = var.project_id

  depends_on = [
    google_project_service.required_apis,
    google_redis_instance.websocket_pubsub
  ]
}

# Create alert policies for critical metrics
# CPU utilization alert for WebSocket server
resource "google_monitoring_alert_policy" "websocket_server_cpu_alert" {
  display_name = "WebSocket Server CPU Utilization Alert - ${var.environment}"
  project      = var.project_id
  combiner     = "OR"
  
  conditions {
    display_name = "CPU utilization exceeds 80%"
    
    condition_threshold {
      filter     = "metric.type=\"run.googleapis.com/container/cpu/utilization\" AND resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${local.format_resource_name("${local.project_name}-websocket")}\""
      duration   = "60s"
      comparison = "COMPARISON_GT"
      threshold_value = 0.8
      
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_MEAN"
        cross_series_reducer = "REDUCE_MEAN"
      }
    }
  }
  
  notification_channels = local.monitoring_notification_channels
  
  documentation {
    content   = "WebSocket server CPU utilization exceeds 80% threshold. This may indicate the need to scale up or optimize the WebSocket server."
    mime_type = "text/markdown"
  }
  
  depends_on = [
    google_project_service.required_apis,
    google_monitoring_notification_channel.email
  ]
}

# Redis memory usage alert
resource "google_monitoring_alert_policy" "redis_memory_alert" {
  display_name = "Redis Memory Usage Alert - ${var.environment}"
  project      = var.project_id
  combiner     = "OR"
  
  conditions {
    display_name = "Redis memory usage exceeds 80%"
    
    condition_threshold {
      filter     = "metric.type=\"redis.googleapis.com/instance/memory/usage_ratio\" AND resource.type=\"redis_instance\" AND resource.labels.instance_id=\"${google_redis_instance.websocket_pubsub.instance_id}\""
      duration   = "300s"
      comparison = "COMPARISON_GT"
      threshold_value = 0.8
      
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_MEAN"
      }
    }
  }
  
  notification_channels = local.monitoring_notification_channels
  
  documentation {
    content   = "Redis memory usage exceeds 80% threshold. Consider increasing Redis memory allocation or optimizing WebSocket pub/sub usage."
    mime_type = "text/markdown"
  }
  
  depends_on = [
    google_project_service.required_apis,
    google_redis_instance.websocket_pubsub,
    google_monitoring_notification_channel.email
  ]
}

# WebSocket error rate alert
resource "google_monitoring_alert_policy" "websocket_error_rate_alert" {
  display_name = "WebSocket Error Rate Alert - ${var.environment}"
  project      = var.project_id
  combiner     = "OR"
  
  conditions {
    display_name = "WebSocket error rate exceeds 5%"
    
    condition_threshold {
      filter     = "metric.type=\"custom.googleapis.com/websocket/error_rate\" AND resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${local.format_resource_name("${local.project_name}-websocket")}\""
      duration   = "300s"
      comparison = "COMPARISON_GT"
      threshold_value = 0.05
      
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_MEAN"
      }
    }
  }
  
  notification_channels = local.monitoring_notification_channels
  
  documentation {
    content   = "WebSocket error rate exceeds 5% threshold. Check logs for error details and investigate potential issues with the WebSocket server or client connections."
    mime_type = "text/markdown"
  }
  
  depends_on = [
    google_project_service.required_apis,
    google_monitoring_notification_channel.email
  ]
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "redis_host" {
  value       = google_redis_instance.websocket_pubsub.host
  description = "The hostname or IP address of the Redis instance for WebSocket pub/sub"
  sensitive   = false
}

output "redis_port" {
  value       = google_redis_instance.websocket_pubsub.port
  description = "The port number of the Redis instance for WebSocket pub/sub"
}

output "vpc_network_id" {
  value       = google_compute_network.vpc_network.id
  description = "The ID of the VPC network for secure communication"
}

output "monitoring_dashboard_urls" {
  value = {
    "websocket_server" = "https://console.cloud.google.com/monitoring/dashboards/custom/${google_monitoring_dashboard.websocket_server_dashboard.dashboard_id}?project=${var.project_id}"
    "system_health"    = "https://console.cloud.google.com/monitoring/dashboards/custom/${google_monitoring_dashboard.system_health_dashboard.dashboard_id}?project=${var.project_id}"
  }
  description = "URLs for the monitoring dashboards"
}

output "environment_name" {
  value       = var.environment
  description = "The name of the deployed environment"
}