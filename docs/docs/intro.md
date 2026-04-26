---
slug: /
sidebar_position: 1
title: Introduction
---

# MCP Gateway

**MCP Gateway** gives your local MCP server a stable public HTTPS URL.

You run a small CLI agent on your machine. It opens a WebSocket to the gateway and
forwards every incoming HTTP request from `https://<id>.mcp-gateway.info` straight
to your local process. No firewall changes, no DNS, no reverse proxy.

## How it works

```
┌──────────────┐  HTTPS  ┌─────────────────┐  WebSocket  ┌──────────────────┐
│  MCP client  │ ──────► │  mcp-gateway.info│ ◄────────► │ mcp-gw agent     │
│  (Claude,    │         │                 │             │  + your local    │
│   Cursor...) │         │                 │             │    MCP server    │
└──────────────┘         └─────────────────┘             └──────────────────┘
```

You only need:

- A free account on [mcp-gateway.info](https://mcp-gateway.info/admin)
- Node.js 20+ on your machine
- A local MCP server reachable on `http://localhost:<port>`

## What you get

- A stable URL: `https://<your-tunnel>.mcp-gateway.info`
- Works with any MCP-compatible client (Claude Desktop, Cursor, custom apps)
- Per-request logs in the admin UI (method, path, status, duration)
- Token-based auth — only your agent can use the tunnel

## Next steps

- [Installation](./installation) — install the CLI
- [Quickstart](./quickstart) — first tunnel in 60 seconds
- [Examples](./examples) — ready-to-run commands for common MCP servers
