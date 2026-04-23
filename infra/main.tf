locals {
  apis = [
    "compute.googleapis.com",
    "dns.googleapis.com",
    "iam.googleapis.com",
  ]
}

resource "google_project_service" "enabled" {
  for_each           = toset(local.apis)
  service            = each.value
  disable_on_destroy = false
}

resource "random_password" "postgres" {
  length  = 32
  special = false
}

resource "google_compute_address" "gateway" {
  name       = "${var.vm_name}-ip"
  region     = var.region
  depends_on = [google_project_service.enabled]
}

data "google_dns_managed_zone" "zone" {
  name = var.dns_zone_name
}

resource "google_dns_record_set" "apex" {
  name         = "${var.base_domain}."
  type         = "A"
  ttl          = 300
  managed_zone = data.google_dns_managed_zone.zone.name
  rrdatas      = [google_compute_address.gateway.address]
}

resource "google_dns_record_set" "wildcard" {
  name         = "*.${var.base_domain}."
  type         = "A"
  ttl          = 300
  managed_zone = data.google_dns_managed_zone.zone.name
  rrdatas      = [google_compute_address.gateway.address]
}

resource "google_service_account" "caddy" {
  account_id   = "${var.vm_name}-caddy"
  display_name = "Caddy DNS-01 solver for ${var.vm_name}"
  depends_on   = [google_project_service.enabled]
}

resource "google_project_iam_member" "caddy_dns_admin" {
  project = var.project_id
  role    = "roles/dns.admin"
  member  = "serviceAccount:${google_service_account.caddy.email}"
}

resource "google_service_account_key" "caddy" {
  service_account_id = google_service_account.caddy.name
}

resource "google_compute_firewall" "web" {
  name    = "${var.vm_name}-allow-web"
  network = "default"
  allow {
    protocol = "tcp"
    ports    = ["80", "443", "3000", "3001"]
  }
  source_ranges = ["0.0.0.0/0"]
  target_tags   = [var.vm_name]
  depends_on    = [google_project_service.enabled]
}

resource "google_compute_firewall" "ssh" {
  name    = "${var.vm_name}-allow-ssh"
  network = "default"
  allow {
    protocol = "tcp"
    ports    = ["22"]
  }
  source_ranges = ["0.0.0.0/0"]
  target_tags   = [var.vm_name]
  depends_on    = [google_project_service.enabled]
}

locals {
  caddy_sa_json = base64decode(google_service_account_key.caddy.private_key)

  env_file = <<-EOT
    POSTGRES_USER=gateway
    POSTGRES_PASSWORD=${random_password.postgres.result}
    POSTGRES_DB=gateway
    BASE_DOMAIN=${var.base_domain}
    ACME_EMAIL=${var.acme_email}
    GCP_PROJECT=${var.project_id}
    ADMIN_EMAIL=${var.admin_email}
    ADMIN_PASSWORD=${var.admin_password}
  EOT

  cloud_init = templatefile("${path.module}/cloud-init.yaml.tftpl", {
    ssh_user     = var.ssh_user
    ssh_pubkey   = var.ssh_pubkey
    repo_url     = var.app_repo_url
    repo_ref     = var.app_repo_ref
    env_file_b64 = base64encode(local.env_file)
    sa_json_b64  = base64encode(local.caddy_sa_json)
  })
}

resource "google_compute_instance" "gateway" {
  name                      = var.vm_name
  machine_type              = var.machine_type
  zone                      = var.zone
  tags                      = [var.vm_name]
  allow_stopping_for_update = true

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2404-lts-amd64"
      size  = var.disk_size_gb
      type  = "pd-balanced"
    }
  }

  network_interface {
    network = "default"
    access_config {
      nat_ip = google_compute_address.gateway.address
    }
  }

  metadata = {
    user-data         = local.cloud_init
    enable-oslogin    = "FALSE"
    ssh-keys          = "${var.ssh_user}:${var.ssh_pubkey}"
  }

  service_account {
    scopes = ["cloud-platform"]
  }

  depends_on = [
    google_project_service.enabled,
    google_compute_firewall.web,
    google_compute_firewall.ssh,
  ]
}
