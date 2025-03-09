output "websocket_service_url" {
  value       = google_cloud_run_service.websocket_server.status[0].url
  description = "The URL of the primary WebSocket server Cloud Run service"
}

output "regional_service_urls" {
  value       = local.regional_service_urls
  description = "Map of region names to WebSocket service URLs for multi-region deployment"
}

output "load_balancer_ip" {
  value       = google_compute_global_address.websocket_lb_ip.address
  description = "The global IP address of the WebSocket server load balancer"
}

output "load_balancer_domain" {
  value       = var.domain_name != "" ? "wss.${var.domain_name}" : "wss-${var.environment}.aiagentnetwork.com"
  description = "The domain name for the WebSocket server load balancer"
}

output "redis_host" {
  value       = google_redis_instance.websocket_redis.host
  description = "The Redis host for WebSocket pub/sub communication between server instances"
  sensitive   = true
}

output "redis_port" {
  value       = google_redis_instance.websocket_redis.port
  description = "The Redis port for WebSocket pub/sub communication"
}

output "service_account_email" {
  value       = google_service_account.websocket_sa.email
  description = "The email of the service account used by the WebSocket server"
}

output "monitoring_dashboard_url" {
  value       = var.enable_monitoring ? "https://console.cloud.google.com/monitoring/dashboards/custom/${google_monitoring_dashboard.websocket_dashboard[0].dashboard_id}?project=${var.project_id}" : ""
  description = "The URL of the WebSocket server monitoring dashboard (empty if monitoring is disabled)"
}

output "vpc_network_id" {
  value       = google_compute_network.websocket_network.id
  description = "The ID of the VPC network used for secure communication"
}