# WebSocket Server Infrastructure Module for AI Agent Network
# This module provisions the necessary infrastructure for a secure, scalable
# WebSocket server that enables agent-to-agent communication.

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
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5.1"
    }
  }
}

# Local variables for resource naming and tagging
locals {
  service_name        = "websocket-server-${var.environment}"
  redis_name          = "websocket-redis-${var.environment}"
  load_balancer_name  = "websocket-lb-${var.environment}"
  service_account_name = "websocket-sa-${var.environment}"
  vpc_network_name    = "websocket-network-${var.environment}"
  
  common_tags = {
    project     = "ai-agent-network"
    component   = "websocket-server"
    environment = "${var.environment}"
    managed-by  = "terraform"
  }
}

# Enable required APIs for the project
resource "google_project_service" "required_apis" {
  for_each = toset([
    "run.googleapis.com",          # Cloud Run API
    "redis.googleapis.com",        # Redis API
    "compute.googleapis.com",      # Compute Engine API
    "monitoring.googleapis.com",   # Cloud Monitoring API
    "secretmanager.googleapis.com" # Secret Manager API
  ])
  
  project = var.project_id
  service = each.value
  
  disable_on_destroy = false
}

# Create a service account for the WebSocket server
resource "google_service_account" "websocket_server_sa" {
  account_id   = local.service_account_name
  display_name = "WebSocket Server Service Account"
  project      = var.project_id
  description  = "Service account for the WebSocket server components"
  
  depends_on = [google_project_service.required_apis]
}

# Assign necessary IAM roles to the service account
resource "google_project_iam_member" "websocket_server_roles" {
  for_each = toset([
    "roles/redis.editor",              # Access to Redis
    "roles/logging.logWriter",         # Write logs
    "roles/monitoring.metricWriter",   # Write metrics
    "roles/secretmanager.secretAccessor" # Access secrets
  ])
  
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.websocket_server_sa.email}"
}

# Create VPC network for secure communication
resource "google_compute_network" "websocket_network" {
  name                    = local.vpc_network_name
  project                 = var.project_id
  auto_create_subnetworks = true
  description             = "VPC network for WebSocket server communication"
  
  depends_on = [google_project_service.required_apis]
}

# Reserve a global IP address for the WebSocket server load balancer
resource "google_compute_global_address" "websocket_lb_ip" {
  name        = "${local.load_balancer_name}-address"
  project     = var.project_id
  description = "Global IP address for WebSocket server load balancer"
  address_type = "EXTERNAL"
  
  depends_on = [google_project_service.required_apis]
}

# Create Redis instance for WebSocket pub/sub communication
resource "google_redis_instance" "websocket_redis" {
  name               = local.redis_name
  project            = var.project_id
  region             = var.region
  memory_size_gb     = var.redis_memory_size_gb
  tier               = "STANDARD"
  redis_version      = "REDIS_6_X"
  display_name       = "WebSocket Server Redis"
  authorized_network = google_compute_network.websocket_network.id
  
  redis_configs = {
    "maxmemory-policy" = "allkeys-lru"
    "notify-keyspace-events" = "Ex"
  }
  
  labels = local.common_tags
  
  depends_on = [
    google_project_service.required_apis,
    google_compute_network.websocket_network
  ]
}

# Create a random suffix for secret IDs
resource "random_id" "secret_suffix" {
  byte_length = 4
}

# Create a secret for Redis connection information
resource "google_secret_manager_secret" "redis_connection" {
  secret_id = "websocket-redis-connection-${var.environment}-${random_id.secret_suffix.hex}"
  project   = var.project_id
  
  replication {
    automatic = true
  }
  
  labels = local.common_tags
  
  depends_on = [google_project_service.required_apis]
}

# Store Redis connection information in the secret
resource "google_secret_manager_secret_version" "redis_connection_version" {
  secret      = google_secret_manager_secret.redis_connection.id
  secret_data = "${google_redis_instance.websocket_redis.host}:${google_redis_instance.websocket_redis.port}"
}

# Create SSL certificate for secure WebSocket connections
resource "google_compute_managed_ssl_certificate" "websocket_ssl" {
  provider = google-beta
  
  name     = "${local.load_balancer_name}-cert"
  project  = var.project_id
  
  managed {
    domains = ["websocket.${var.domain_name}"]
  }
  
  depends_on = [google_project_service.required_apis]
}

# Deploy the primary WebSocket server as a Cloud Run service
resource "google_cloud_run_service" "websocket_server" {
  name     = local.service_name
  project  = var.project_id
  location = var.region
  
  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/${local.service_name}:latest"
        
        resources {
          limits = {
            cpu    = var.websocket_server_cpu
            memory = var.websocket_server_memory
          }
        }
        
        env {
          name  = "ENVIRONMENT"
          value = var.environment
        }
        
        env {
          name  = "REDIS_HOST"
          value = google_redis_instance.websocket_redis.host
        }
        
        env {
          name  = "REDIS_PORT"
          value = google_redis_instance.websocket_redis.port
        }
        
        env {
          name  = "NODE_ENV"
          value = var.environment == "production" ? "production" : "development"
        }
        
        # Port where the WebSocket server will listen
        ports {
          container_port = 8080
        }
        
        # Health check for the WebSocket server
        liveness_probe {
          http_get {
            path = "/health"
          }
          initial_delay_seconds = 10
          timeout_seconds       = 5
          period_seconds        = 15
        }
      }
      
      container_concurrency = var.container_concurrency
      timeout_seconds       = var.timeout_seconds
      service_account_name  = google_service_account.websocket_server_sa.email
    }
    
    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale" = var.websocket_server_min_instances
        "autoscaling.knative.dev/maxScale" = var.websocket_server_max_instances
        # CPU-based autoscaling
        "autoscaling.knative.dev/target" = "70"
        "autoscaling.knative.dev/metric" = "cpu"
      }
      
      labels = local.common_tags
    }
  }
  
  traffic {
    percent         = 100
    latest_revision = true
  }
  
  metadata {
    annotations = {
      "run.googleapis.com/launch-stage" = "BETA"
    }
  }
  
  depends_on = [
    google_project_service.required_apis,
    google_service_account.websocket_server_sa,
    google_redis_instance.websocket_redis
  ]
}

# Allow public access to the WebSocket server
resource "google_cloud_run_service_iam_member" "websocket_server_public" {
  service  = google_cloud_run_service.websocket_server.name
  location = google_cloud_run_service.websocket_server.location
  project  = var.project_id
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Additional regional WebSocket servers for high availability
resource "google_cloud_run_service" "regional_websocket_servers" {
  for_each = var.multi_region_deployment ? toset(var.additional_regions) : []
  
  name     = "${local.service_name}-${each.value}"
  project  = var.project_id
  location = each.value
  
  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/${local.service_name}:latest"
        
        resources {
          limits = {
            cpu    = var.websocket_server_cpu
            memory = var.websocket_server_memory
          }
        }
        
        env {
          name  = "ENVIRONMENT"
          value = var.environment
        }
        
        env {
          name  = "REDIS_HOST"
          value = google_redis_instance.websocket_redis.host
        }
        
        env {
          name  = "REDIS_PORT"
          value = google_redis_instance.websocket_redis.port
        }
        
        env {
          name  = "NODE_ENV"
          value = var.environment == "production" ? "production" : "development"
        }
        
        # Port where the WebSocket server will listen
        ports {
          container_port = 8080
        }
        
        # Health check for the WebSocket server
        liveness_probe {
          http_get {
            path = "/health"
          }
          initial_delay_seconds = 10
          timeout_seconds       = 5
          period_seconds        = 15
        }
      }
      
      container_concurrency = var.container_concurrency
      timeout_seconds       = var.timeout_seconds
      service_account_name  = google_service_account.websocket_server_sa.email
    }
    
    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale" = var.websocket_server_min_instances
        "autoscaling.knative.dev/maxScale" = var.websocket_server_max_instances
        "autoscaling.knative.dev/target" = "70"
        "autoscaling.knative.dev/metric" = "cpu"
      }
      
      labels = local.common_tags
    }
  }
  
  traffic {
    percent         = 100
    latest_revision = true
  }
  
  metadata {
    annotations = {
      "run.googleapis.com/launch-stage" = "BETA"
    }
  }
  
  depends_on = [
    google_project_service.required_apis,
    google_service_account.websocket_server_sa,
    google_redis_instance.websocket_redis
  ]
}

# Allow public access to the regional WebSocket servers
resource "google_cloud_run_service_iam_member" "regional_websocket_server_public" {
  for_each = var.multi_region_deployment ? toset(var.additional_regions) : []
  
  service  = google_cloud_run_service.regional_websocket_servers[each.value].name
  location = google_cloud_run_service.regional_websocket_servers[each.value].location
  project  = var.project_id
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Create network endpoint groups for the primary WebSocket server
resource "google_compute_region_network_endpoint_group" "websocket_server_neg" {
  name                  = "${local.service_name}-neg"
  project               = var.project_id
  region                = var.region
  network_endpoint_type = "SERVERLESS"
  
  cloud_run {
    service = google_cloud_run_service.websocket_server.name
  }
  
  depends_on = [google_cloud_run_service.websocket_server]
}

# Create network endpoint groups for the regional WebSocket servers
resource "google_compute_region_network_endpoint_group" "regional_websocket_server_negs" {
  for_each = var.multi_region_deployment ? toset(var.additional_regions) : []
  
  name                  = "${local.service_name}-${each.value}-neg"
  project               = var.project_id
  region                = each.value
  network_endpoint_type = "SERVERLESS"
  
  cloud_run {
    service = google_cloud_run_service.regional_websocket_servers[each.value].name
  }
  
  depends_on = [google_cloud_run_service.regional_websocket_servers]
}

# Create a health check for the WebSocket backend
resource "google_compute_health_check" "websocket_health_check" {
  name               = "${local.load_balancer_name}-health-check"
  project            = var.project_id
  check_interval_sec = 15
  timeout_sec        = 5
  
  http_health_check {
    port         = 80
    request_path = "/health"
  }
  
  depends_on = [google_project_service.required_apis]
}

# Create a backend service for the WebSocket servers
resource "google_compute_backend_service" "websocket_backend" {
  name                  = "${local.load_balancer_name}-backend"
  project               = var.project_id
  protocol              = "HTTP2"
  port_name             = "http"
  timeout_sec           = var.timeout_seconds
  enable_cdn            = false
  health_checks         = [google_compute_health_check.websocket_health_check.id]
  
  # Add the primary region backend
  backend {
    group = google_compute_region_network_endpoint_group.websocket_server_neg.id
  }
  
  # Add backends for additional regions if multi-region deployment is enabled
  dynamic "backend" {
    for_each = var.multi_region_deployment ? toset(var.additional_regions) : []
    
    content {
      group = google_compute_region_network_endpoint_group.regional_websocket_server_negs[backend.value].id
    }
  }
  
  depends_on = [
    google_compute_region_network_endpoint_group.websocket_server_neg,
    google_compute_region_network_endpoint_group.regional_websocket_server_negs
  ]
}

# Create a URL map for the load balancer
resource "google_compute_url_map" "websocket_url_map" {
  name            = "${local.load_balancer_name}-url-map"
  project         = var.project_id
  default_service = google_compute_backend_service.websocket_backend.id
  
  depends_on = [google_compute_backend_service.websocket_backend]
}

# Create an HTTPS proxy for the load balancer
resource "google_compute_target_https_proxy" "websocket_https_proxy" {
  name             = "${local.load_balancer_name}-https-proxy"
  project          = var.project_id
  url_map          = google_compute_url_map.websocket_url_map.id
  ssl_certificates = [google_compute_managed_ssl_certificate.websocket_ssl.id]
  
  depends_on = [
    google_compute_url_map.websocket_url_map,
    google_compute_managed_ssl_certificate.websocket_ssl
  ]
}

# Create a global forwarding rule for the load balancer
resource "google_compute_global_forwarding_rule" "websocket_forwarding_rule" {
  name                  = "${local.load_balancer_name}-forwarding-rule"
  project               = var.project_id
  target                = google_compute_target_https_proxy.websocket_https_proxy.id
  port_range            = "443"
  ip_address            = google_compute_global_address.websocket_lb_ip.address
  load_balancing_scheme = "EXTERNAL"
  
  depends_on = [
    google_compute_target_https_proxy.websocket_https_proxy,
    google_compute_global_address.websocket_lb_ip
  ]
}

# Set up monitoring dashboard if enabled
resource "google_monitoring_dashboard" "websocket_dashboard" {
  count = var.enable_monitoring ? 1 : 0
  
  dashboard_json = file("${path.module}/../../monitoring/dashboards/websocket-metrics.json")
  project        = var.project_id
  
  depends_on = [google_project_service.required_apis]
}

# Create notification channel for alerts
resource "google_monitoring_notification_channel" "email_notification" {
  count = var.enable_monitoring ? 1 : 0
  
  display_name = "WebSocket Server Alerts"
  project      = var.project_id
  type         = "email"
  
  labels = {
    email_address = var.alert_notification_email
  }
  
  depends_on = [google_project_service.required_apis]
}

# Create alert policy for high error rates
resource "google_monitoring_alert_policy" "websocket_error_rate_alert" {
  count = var.enable_monitoring ? 1 : 0
  
  display_name = "WebSocket Server High Error Rate"
  project      = var.project_id
  combiner     = "OR"
  
  conditions {
    display_name = "Error rate exceeds threshold"
    
    condition_threshold {
      filter          = "metric.type=\"custom.googleapis.com/websocket/error_rate\" resource.type=\"cloud_run_revision\" resource.label.\"service_name\"=\"${local.service_name}\""
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
  
  notification_channels = [
    google_monitoring_notification_channel.email_notification[0].id
  ]
  
  alert_strategy {
    auto_close = "1800s"  # Auto-close after 30 minutes
  }
  
  depends_on = [google_monitoring_notification_channel.email_notification]
}

# Create alert policy for high latency
resource "google_monitoring_alert_policy" "websocket_latency_alert" {
  count = var.enable_monitoring ? 1 : 0
  
  display_name = "WebSocket Server High Latency"
  project      = var.project_id
  combiner     = "OR"
  
  conditions {
    display_name = "Message latency exceeds threshold"
    
    condition_threshold {
      filter          = "metric.type=\"custom.googleapis.com/websocket/message_latency\" resource.type=\"cloud_run_revision\" resource.label.\"service_name\"=\"${local.service_name}\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 500  # 500ms
      
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_PERCENTILE_95"
        cross_series_reducer = "REDUCE_MEAN"
      }
    }
  }
  
  notification_channels = [
    google_monitoring_notification_channel.email_notification[0].id
  ]
  
  alert_strategy {
    auto_close = "1800s"  # Auto-close after 30 minutes
  }
  
  depends_on = [google_monitoring_notification_channel.email_notification]
}

# Create alert policy for instance count approaching max
resource "google_monitoring_alert_policy" "websocket_instance_count_alert" {
  count = var.enable_monitoring ? 1 : 0
  
  display_name = "WebSocket Server Instance Count Near Maximum"
  project      = var.project_id
  combiner     = "OR"
  
  conditions {
    display_name = "Instance count approaching maximum"
    
    condition_threshold {
      filter          = "metric.type=\"run.googleapis.com/container/instance_count\" resource.type=\"cloud_run_revision\" resource.label.\"service_name\"=\"${local.service_name}\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = var.websocket_server_max_instances * 0.8  # 80% of max instances
      
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_MEAN"
        cross_series_reducer = "REDUCE_SUM"
      }
    }
  }
  
  notification_channels = [
    google_monitoring_notification_channel.email_notification[0].id
  ]
  
  alert_strategy {
    auto_close = "1800s"  # Auto-close after 30 minutes
  }
  
  depends_on = [google_monitoring_notification_channel.email_notification]
}

# Outputs
output "websocket_service_url" {
  value       = google_cloud_run_service.websocket_server.status[0].url
  description = "URL of the primary Cloud Run WebSocket service for client connections"
}

output "regional_service_urls" {
  value = var.multi_region_deployment ? {
    for region in var.additional_regions :
    region => google_cloud_run_service.regional_websocket_servers[region].status[0].url
  } : {}
  description = "URLs of regional WebSocket services for multi-region deployment"
}

output "load_balancer_ip" {
  value       = google_compute_global_address.websocket_lb_ip.address
  description = "Global IP address of the load balancer for WebSocket connections"
}

output "load_balancer_domain" {
  value       = "websocket.${var.domain_name}"
  description = "Domain name for the WebSocket server load balancer"
}

output "redis_host" {
  value       = google_redis_instance.websocket_redis.host
  description = "Redis host for WebSocket pub/sub communication between server instances"
  sensitive   = true
}

output "redis_port" {
  value       = google_redis_instance.websocket_redis.port
  description = "Redis port for WebSocket pub/sub communication"
}

output "service_account_email" {
  value       = google_service_account.websocket_server_sa.email
  description = "Email of the service account used by the WebSocket server"
}

output "monitoring_dashboard_url" {
  value       = var.enable_monitoring ? "https://console.cloud.google.com/monitoring/dashboards/custom/${google_monitoring_dashboard.websocket_dashboard[0].name}" : ""
  description = "URL of the WebSocket server monitoring dashboard"
}

output "vpc_network_id" {
  value       = google_compute_network.websocket_network.id
  description = "ID of the VPC network used for secure communication"
}