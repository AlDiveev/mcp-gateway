output "external_ip" {
  value = google_compute_address.gateway.address
}

output "gateway_url" {
  value = "https://${var.base_domain}"
}

output "admin_url" {
  value = "https://${var.base_domain}/admin/"
}

output "ssh_command" {
  value = "ssh ${var.ssh_user}@${google_compute_address.gateway.address}"
}
