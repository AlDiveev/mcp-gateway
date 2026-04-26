# MCP Gateway — CLAUDE.md

## Стек

- **Runtime:** Node.js 20+
- **Framework:** Express 5
- **Language:** TypeScript strict
- **Env:** dotenv

## Текущая структура

```
src/
├── config/config.ts        — PORT, NODE_ENV из .env
├── app.ts                  — Express-приложение, middleware
├── server.ts               — точка входа, listen
```

## Куда движемся

```
src/
├── controllers/            — HTTP-обработчики, только req/res
├── services/               — бизнес-логика
├── repositories/           — работа с БД
├── routes/                 — монтирование роутов
├── middleware/             — auth, error handler
├── config/
├── app.ts
└── server.ts
```

## Правила

- SOLID, DRY
- Без комментариев в коде
- Контроллер — только req/res, логика в сервисе
- Сервис не знает про Express
- `noUnusedLocals`, `noUnusedParameters` — строго

## Заметки в Obsidian (если запущен)

`MCP-Gateway/` — архитектура, протокол, решения.
Писать через `mcp-obsidian` плагин.

---

## Deployment

### Архитектура в проде

Два plain-Node сервера в одном процессе, разные порты, **без TLS на Node**:

- `3000` — Express HTTP (admin UI, API, tunnel proxy по Host header)
- `3001` — `ws.WebSocketServer` (агенты туннелей)

Роутинг туннелей — по Host: `<tunnelId>.mcp-gateway.info` → forward на агента.
`mcp-gateway.info` (корень) → admin/UI. Дискриминация делается через `ROOT_DOMAIN`
env и `extractTunnelId` в `TunnelService`.

### GCP ресурсы

- **Project:** `sixth-hawk-434814-q8`
- **Zone/Region:** `us-central1-a` / `us-central1`
- **VM:** `e2-small`, Ubuntu 24.04, disk 30GB, static external IP `136.115.222.21`
- **Cloud DNS zone:** `mcp-gateway-info` (DNS name `mcp-gateway.info.`)
  - `A mcp-gateway.info → 136.115.222.21`
  - `A *.mcp-gateway.info → 136.115.222.21` (wildcard для туннелей)
  - NS делегированы у регистратора на Cloud DNS
- **Firewall:** TCP 22, 80, 443, 3000, 3001
- Стоимость ~$15–20/мес (VM + static IP + DNS).

### Terraform (`infra/`)

```
infra/
├── versions.tf          — google, random, tls providers
├── variables.tf         — project_id, region, zone, base_domain, dns_zone_name, ...
├── main.tf              — APIs, static IP, firewall, DNS recordsets, compute_instance
├── outputs.tf           — external_ip, gateway_url, admin_url, ssh_command
├── cloud-init.yaml.tftpl — bootstrap: docker, clone repo, .env, systemd unit
└── terraform.tfvars     — реальные значения (в .gitignore)
```

`google_compute_instance` с `allow_stopping_for_update = true` — нужно для смены
machine_type без пересоздания.

Состояние и tfvars — в `.gitignore` (`infra/terraform.tfstate*`, `infra/terraform.tfvars`,
`infra/.terraform/`).

### Docker и репо

- **Репозиторий:** https://github.com/AlDiveev/mcp-gateway.git (публичный)
- **VM layout:**
  - `/opt/gateway/app`    — клон репо
  - `/opt/gateway/deploy` — копия `deploy/` из репо (`docker-compose.yml`)
  - `/opt/gateway/.env`   — BASE_DOMAIN, POSTGRES_*, ADMIN_*
- **Dockerfile** (корень): `node:22-slim`, двухстадийный builder+runtime,
  `npm install` (НЕ `npm ci` — lock плохо дружит), `npx prisma generate && npm run build`.
  Runtime CMD: `npx prisma migrate deploy && node dist/server.js`.
- **deploy/docker-compose.yml:** только `postgres` + `gateway`. Никаких reverse-proxy.
  Порты проброшены напрямую: `3000:3000`, `3001:3001`.

### systemd

`mcp-gateway.service` на VM запускает `docker compose --env-file /opt/gateway/.env up -d`
из `/opt/gateway/deploy`.

### Стандартный деплой обновления

```bash
ssh ops@136.115.222.21
cd /opt/gateway/app && git pull
sudo cp -r deploy/. /opt/gateway/deploy/
cd /opt/gateway/deploy
sudo docker compose --env-file /opt/gateway/.env up -d --build
```

### Prisma 7 — грабли

- `datasource db { url = ... }` в `schema.prisma` **запрещено** — Prisma 7 падает
  с "datasource.url is not allowed in schema". URL задаётся **только** через
  `prisma.config.ts` (`defineConfig({ datasource: { url: env.DATABASE_URL } })`).
- `prisma.config.ts` обязательно должен присутствовать в билд-контексте Docker.
- `migrate.adapter` — `PrismaPg` из `@prisma/adapter-pg`.

### package.json — runtime deps

Runtime-образ ставит `npm install --omit=dev`, поэтому **в `dependencies`** должны быть:
`@prisma/adapter-pg`, `@prisma/client`, `prisma`, `dotenv`, `express`, `ws`, `zod`.
Если что-то из этого уедет в `devDependencies` — контейнер упадёт с
`Cannot find module ...`.

### extractTunnelId — известный баг

`src/services/tunnel.service.ts::extractTunnelId` при отсутствии `ROOT_DOMAIN`
берёт первый сегмент hostname. Если обращаться к серверу **по IP** (`136.115.222.21`),
первый октет (`136`) трактуется как tunnelId → admin UI недоступен.

Фикс: требовать `hostname.endsWith('.' + rootDomain)` и hostname !== rootDomain —
иначе `return null` (считаем это запросом к корню). Реализовано в текущей версии
файла (строки 186–201).

### Что НЕ предлагать (пользователь отверг явно)

- ❌ **Caddy** — xcaddy не собирается с актуальными libdns-плагинами, отказ.
- ❌ **Cloudflare** — не используем, точка.
- ❌ **TLS на Node** (HTTPS через node:https, node:tls) — отказ, два plain-HTTP порта.
- ❌ **Объединение HTTP и WS на один порт** — см. MEMORY.md: WS всегда на своём порту,
  не attach на http.Server Express.
- ❌ **acme-client / lego / автоматический ACME внутри Node** — отказ.

### Админка / URL

- Admin UI: `http://136.115.222.21:3000/admin` (и `http://mcp-gateway.info:3000/admin`
  после фикса extractTunnelId).
- Туннели: `http://<id>.mcp-gateway.info:3000/...`
- Agent WS: `ws://<id>.mcp-gateway.info:3001/?token=...`

TLS на 443 пока не настроен — если понадобится, делать **вне** Node (например,
nginx на той же VM как тонкий TLS-терминатор на 443 → 3000/3001), но только
по явному запросу.
