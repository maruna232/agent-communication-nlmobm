# Core configuration variables
variable "project_id" {
  description = "The Google Cloud Project ID where WebSocket server resources will be deployed"
  type        = string
}

variable "region" {
  description = "The primary Google Cloud region for WebSocket server deployment"
  type        = string
}

variable "environment" {
  description = "The deployment environment (dev, staging, production) for resource naming and configuration"
  type        = string
}

# WebSocket server scaling configuration
variable "websocket_server_min_instances" {
  description = "Minimum number of WebSocket server instances to maintain for high availability"
  type        = number
  default     = 2
}

variable "websocket_server_max_instances" {
  description = "Maximum number of WebSocket server instances for auto-scaling during peak loads"
  type        = number
  default     = 20
}

variable "websocket_server_cpu" {
  description = "CPU allocation for each WebSocket server instance (e.g., '1' for 1 vCPU)"
  type        = string
  default     = "1"
}

variable "websocket_server_memory" {
  description = "Memory allocation for each WebSocket server instance (e.g., '2Gi' for 2GB RAM)"
  type        = string
  default     = "2Gi"
}

# High availability and multi-region configuration
variable "multi_region_deployment" {
  description = "Flag to enable multi-region deployment for high availability and global performance"
  type        = bool
  default     = false
}

variable "additional_regions" {
  description = "List of additional Google Cloud regions for multi-region WebSocket server deployment"
  type        = list(string)
  default     = ["europe-west1", "asia-northeast1"]
}

variable "domain_name" {
  description = "Domain name for the WebSocket server (used for load balancer configuration)"
  type        = string
  default     = "aiagentnetwork.com"
}

# Redis configuration for WebSocket pub/sub
variable "redis_memory_size_gb" {
  description = "Memory size in GB for Redis instance used for WebSocket pub/sub communication"
  type        = number
  default     = 1
}

# Monitoring and alerting configuration
variable "enable_monitoring" {
  description = "Flag to enable monitoring dashboards and alerts for WebSocket server"
  type        = bool
  default     = true
}

variable "alert_notification_email" {
  description = "Email address for WebSocket server monitoring alerts"
  type        = string
  default     = "alerts@aiagentnetwork.com"
}

# Request handling configuration
variable "container_concurrency" {
  description = "Maximum number of concurrent requests per WebSocket server instance"
  type        = number
  default     = 80
}

variable "timeout_seconds" {
  description = "Request timeout in seconds for WebSocket server instances"
  type        = number
  default     = 300
}