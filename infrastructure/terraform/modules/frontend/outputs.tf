# Output variables for the frontend Terraform module

output "frontend_url" {
  value       = vercel_deployment.frontend_deployment.url
  description = "The URL of the deployed frontend application"
}

output "vercel_deployment_id" {
  value       = vercel_deployment.frontend_deployment.id
  description = "The deployment ID of the Vercel project"
}

output "frontend_domain" {
  value       = local.frontend_domain
  description = "The custom domain for the frontend application"
}

output "vercel_project_name" {
  value       = vercel_project.frontend.name
  description = "The name of the Vercel project for the frontend application"
}

output "monitoring_dashboard_url" {
  value       = var.enable_monitoring ? "https://console.cloud.google.com/monitoring/dashboards/custom/${google_monitoring_dashboard.frontend_dashboard[0].dashboard_id}?project=${var.project_id}" : ""
  description = "The URL of the frontend monitoring dashboard (empty if monitoring is disabled)"
}