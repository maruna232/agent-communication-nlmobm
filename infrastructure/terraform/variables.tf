# General configuration variables
variable "project_id" {
  description = "The Google Cloud Project ID where resources will be deployed"
  type        = string
}

variable "region" {
  description = "The primary Google Cloud region for resource deployment"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "The deployment environment (dev, staging, production)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be one of: dev, staging, production."
  }
}

# WebSocket server configuration
variable "websocket_server_min_instances" {
  description = "Minimum number of WebSocket server instances for high availability"
  type        = number
  default     = 2
}

variable "websocket_server_max_instances" {
  description = "Maximum number of WebSocket server instances for scaling"
  type        = number
  default     = 20
}

variable "websocket_server_cpu" {
  description = "CPU allocation for each WebSocket server instance"
  type        = string
  default     = "1"
}

variable "websocket_server_memory" {
  description = "Memory allocation for each WebSocket server instance"
  type        = string
  default     = "2Gi"
}

variable "redis_memory_size_gb" {
  description = "Memory size in GB for Redis instance used for WebSocket pub/sub"
  type        = number
  default     = 1
}

# Vercel frontend configuration
variable "vercel_project_id" {
  description = "The Vercel project ID for frontend deployment"
  type        = string
}

variable "vercel_team_id" {
  description = "The Vercel team ID for frontend deployment"
  type        = string
  default     = ""
}

variable "vercel_api_token" {
  description = "The Vercel API token for frontend deployment"
  type        = string
  sensitive   = true
}

# Firebase and API keys
variable "firebase_project_id" {
  description = "The Firebase project ID for authentication services"
  type        = string
}

variable "firebase_api_key" {
  description = "The Firebase API key for client-side authentication"
  type        = string
  sensitive   = true
}

variable "openai_api_key" {
  description = "The OpenAI API key for GPT-4o integration"
  type        = string
  sensitive   = true
}

# Multi-region deployment configuration
variable "multi_region_deployment" {
  description = "Flag to enable multi-region deployment for high availability"
  type        = bool
  default     = false
}

variable "additional_regions" {
  description = "Additional Google Cloud regions for multi-region deployment"
  type        = list(string)
  default     = ["europe-west1", "asia-northeast1"]
}

# Networking and domain configuration
variable "domain_name" {
  description = "The domain name for the application"
  type        = string
  default     = "aiagentnetwork.com"
}

# Monitoring and alerting configuration
variable "alert_notification_email" {
  description = "Email address for monitoring alerts"
  type        = string
  default     = "alerts@aiagentnetwork.com"
}

variable "container_concurrency" {
  description = "Maximum number of concurrent requests per WebSocket server instance"
  type        = number
  default     = 80
}

variable "enable_monitoring" {
  description = "Flag to enable monitoring dashboards and alerts"
  type        = bool
  default     = true
}

variable "pagerduty_service_key" {
  description = "PagerDuty service key for critical alerts in production environment"
  type        = string
  default     = ""
  sensitive   = true
}