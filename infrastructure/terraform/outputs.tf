# Output variables for the AI Agent Network infrastructure

output "frontend_url" {
  value       = "https://${var.environment == "production" ? var.domain_name : "${var.environment}.${var.domain_name}"}"
  description = "The URL of the deployed frontend application for the ${var.environment} environment"
}

output "frontend_domain" {
  value       = var.environment == "production" ? var.domain_name : "${var.environment}.${var.domain_name}"
  description = "The custom domain configured for the frontend application in the ${var.environment} environment"
}

output "environment_name" {
  value       = var.environment
  description = "The deployment environment name (dev, staging, production)"
}

output "deployment_info" {
  value = {
    environment              = var.environment
    frontend_url             = "https://${var.environment == "production" ? var.domain_name : "${var.environment}.${var.domain_name}"}"
    websocket_server_url     = "wss://${var.environment == "production" ? "ws.${var.domain_name}" : "ws-${var.environment}.${var.domain_name}"}"
    primary_region           = var.region
    multi_region_enabled     = var.multi_region_deployment
    regions_deployed         = var.multi_region_deployment ? concat([var.region], var.additional_regions) : [var.region]
    websocket_min_instances  = var.websocket_server_min_instances
    websocket_max_instances  = var.websocket_server_max_instances
    gcp_project_id           = var.project_id
    firebase_project_id      = var.firebase_project_id
    deployment_timestamp     = timestamp()
  }
  description = "Consolidated deployment information for documentation, CI/CD pipelines, and operational use"
}