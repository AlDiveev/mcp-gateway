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
