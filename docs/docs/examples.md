---
sidebar_position: 4
title: Examples
---

# Examples

Ready-to-run commands for the most common MCP servers.

In every example you need two terminals:

1. **Terminal A** — runs the MCP server (HTTP-exposed).
2. **Terminal B** — runs `mcp-gw` to connect that server to the tunnel.

Replace `<TUNNEL_ID>` and `<TOKEN>` with values from the [admin UI](https://mcp-gateway.info/admin).

---

## Why `supergateway`?

Most reference MCP servers (memory, filesystem, github, etc.) speak the
**stdio transport** — they read JSON-RPC frames from `stdin` and write
responses to `stdout`. They have no HTTP server inside them.

MCP Gateway, on the other hand, can only tunnel **HTTP** traffic — that's
the whole point of giving you a public HTTPS URL.

[`supergateway`](https://github.com/supercorp-ai/supergateway) bridges the gap.
It launches a stdio MCP server as a subprocess, then exposes it over HTTP
(streamable-HTTP or SSE). Pipeline:

```
MCP client ──HTTPS──► mcp-gateway.info
                          │  (WebSocket tunnel)
                          ▼
                       mcp-gw agent ──HTTP──► supergateway ──stdio──► docker run mcp/memory
                          (localhost)            (localhost:8080)         (subprocess)
```

So the command:

```bash
npx -y supergateway \
  --stdio "docker run -i --rm -v mcp-memory:/app/dist mcp/memory" \
  --outputTransport streamableHttp \
  --port 8080
```

means:

| Flag                                | What it does                                                                                  |
| ----------------------------------- | --------------------------------------------------------------------------------------------- |
| `npx -y supergateway`               | Run `supergateway` from npm without installing it globally (`-y` auto-confirms install).       |
| `--stdio "docker run -i --rm ..."`  | The actual MCP server. `-i` keeps stdin open (stdio transport needs it). `--rm` cleans up.    |
| `-v mcp-memory:/app/dist`           | Persistent Docker volume so the memory server doesn't lose state between restarts.            |
| `mcp/memory`                        | Official MCP memory server image.                                                             |
| `--outputTransport streamableHttp`  | Wrap stdio into MCP **streamable-HTTP** transport (the modern HTTP transport for MCP).        |
| `--port 8080`                       | Expose that HTTP server on `localhost:8080` so `mcp-gw` can forward into it.                  |

Without `supergateway` you'd have nothing for `mcp-gw --target http://localhost:8080`
to talk to — `mcp/memory` alone has no HTTP listener.

---

## Memory server

A persistent key/value memory MCP server, exposed publicly.

**Terminal A — start the MCP server (stdio → HTTP):**

```bash
npx -y supergateway \
  --stdio "docker run -i --rm -v mcp-memory:/app/dist mcp/memory" \
  --outputTransport streamableHttp \
  --port 8080
```

**Terminal B — open the tunnel:**

```bash
mcp-gw connect \
  --tunnel-id <TUNNEL_ID> \
  --token <TOKEN> \
  --target http://localhost:8080
```

Public URL: `https://<TUNNEL_ID>.mcp-gateway.info/mcp`

---

## Filesystem server

Expose a local directory as an MCP filesystem server.

**Terminal A:**

```bash
npx -y supergateway \
  --stdio "npx -y @modelcontextprotocol/server-filesystem /Users/me/projects" \
  --outputTransport streamableHttp \
  --port 8080
```

**Terminal B:**

```bash
mcp-gw connect \
  --tunnel-id <TUNNEL_ID> \
  --token <TOKEN> \
  --target http://localhost:8080
```

> ⚠️ The filesystem server gives **read/write** access to that directory
> to anyone with your tunnel URL. Don't expose `~/` or anything sensitive.

---

## GitHub server

```bash
export GITHUB_PERSONAL_ACCESS_TOKEN=ghp_xxx

npx -y supergateway \
  --stdio "npx -y @modelcontextprotocol/server-github" \
  --outputTransport streamableHttp \
  --port 8080
```

```bash
mcp-gw connect \
  --tunnel-id <TUNNEL_ID> \
  --token <TOKEN> \
  --target http://localhost:8080
```

---

## A native HTTP MCP server

If your MCP server already speaks HTTP (e.g. you wrote it yourself with
`@modelcontextprotocol/sdk` and the `StreamableHTTPServerTransport`),
you don't need `supergateway` at all:

**Terminal A:**

```bash
node my-mcp-server.js   # listens on http://localhost:3333
```

**Terminal B:**

```bash
mcp-gw connect \
  --tunnel-id <TUNNEL_ID> \
  --token <TOKEN> \
  --target http://localhost:3333
```

---

## Connect from a client

In Claude Desktop / Cursor config, add:

```json
{
  "mcpServers": {
    "my-tunnel": {
      "url": "https://<TUNNEL_ID>.mcp-gateway.info/mcp"
    }
  }
}
```

Restart the client and your MCP tools will appear.
