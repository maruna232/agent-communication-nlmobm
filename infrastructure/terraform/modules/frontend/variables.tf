variable "project_id" {
  description = "The Google Cloud Project ID where monitoring resources will be deployed"
  type        = string
}

variable "environment" {
  description = "The deployment environment (dev, staging, production) for resource naming and configuration"
  type        = string
}

variable "vercel_project_id" {
  description = "The Vercel project ID for frontend deployment"
  type        = string
}

variable "vercel_team_id" {
  description = "The Vercel team ID for frontend deployment"
  type        = string
  default     = ""
}

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

variable "websocket_server_url" {
  description = "The URL of the WebSocket server for agent-to-agent communication"
  type        = string
}

variable "domain_name" {
  description = "The domain name for the frontend application"
  type        = string
  default     = "aiagentnetwork.com"
}

variable "enable_monitoring" {
  description = "Flag to enable monitoring dashboards and alerts for frontend"
  type        = bool
  default     = true
}

variable "alert_notification_email" {
  description = "Email address for frontend monitoring alerts"
  type        = string
  default     = "alerts@aiagentnetwork.com"
}