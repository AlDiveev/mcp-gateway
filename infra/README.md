# MCP Gateway — GCP deploy (Terraform)

One VM on Compute Engine + Caddy (wildcard TLS via Google Cloud DNS) + Postgres in docker-compose.

## Prerequisites

- `gcloud` CLI, authenticated: `gcloud auth application-default login`
- A GCP project with billing enabled
- A registered domain you control (DNS can be moved to Cloud DNS)
- `terraform >= 1.5`

## One-time setup

```
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars: project_id, base_domain, dns_zone_dns_name, acme_email,
# admin_password, ssh_pubkey, app_repo_url
```

Notes on `base_domain` vs `dns_zone_dns_name`:
- `dns_zone_dns_name` is the apex (e.g. `example.com`) — Cloud DNS zone is created for it.
- `base_domain` is the host clients hit (e.g. `gateway.example.com`). Apex + wildcard A-records are created: `gateway.example.com` and `*.gateway.example.com` both point to the VM IP.

## Deploy

```
terraform init
terraform apply
```

Outputs include `external_ip`, `name_servers`, `gateway_url`, `ssh_command`.

## Delegate DNS (if your registrar is outside GCP)

Take `name_servers` from the output and set them as NS records at your registrar for the apex zone. Propagation: minutes to hours.

Once NS is live, Caddy will obtain a wildcard Let's Encrypt cert for `*.<base_domain>` automatically via DNS-01.

## What runs on the VM

- `caddy` on :80/:443 — terminates TLS, reverse-proxies HTTP to `gateway:3000` and WebSocket upgrades to `gateway:3001`.
- `gateway` — the app, runs `prisma migrate deploy` then `node dist/server.js`.
- `postgres` — data in a named docker volume.

systemd unit `mcp-gateway.service` brings compose up on boot.

## Useful

```
ssh ops@<external_ip>
sudo systemctl status mcp-gateway
cd /opt/gateway/deploy && sudo docker compose logs -f
```

## Destroy

```
terraform destroy
```

The Cloud DNS zone is deleted too — remove NS delegation at the registrar afterwards.
