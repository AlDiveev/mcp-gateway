variable "project_id" {
  type        = string
  description = "GCP project ID"
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "zone" {
  type    = string
  default = "us-central1-a"
}

variable "base_domain" {
  type        = string
  description = "Apex domain delegated to Cloud DNS (e.g. gateway.example.com). A and wildcard records are created for this name."
}

variable "dns_zone_name" {
  type        = string
  description = "Existing Cloud DNS managed zone resource name (as listed in Console → Cloud DNS → Zones → Zone name column)."
}

variable "acme_email" {
  type        = string
  description = "Email for Let's Encrypt registration"
}

variable "admin_email" {
  type    = string
  default = "admin@admin.com"
}

variable "admin_password" {
  type      = string
  default   = "admin"
  sensitive = true
}

variable "machine_type" {
  type    = string
  default = "e2-micro"
}

variable "vm_name" {
  type    = string
  default = "mcp-gateway"
}

variable "disk_size_gb" {
  type    = number
  default = 30
}

variable "app_repo_url" {
  type        = string
  default     = ""
  description = "Git URL of the app repo cloned onto the VM. If empty, VM is provisioned with Docker only; deploy the app manually later."
}

variable "app_repo_ref" {
  type    = string
  default = "main"
}

variable "ssh_user" {
  type    = string
  default = "ops"
}

variable "ssh_pubkey" {
  type        = string
  description = "Public SSH key for the ops user"
}
