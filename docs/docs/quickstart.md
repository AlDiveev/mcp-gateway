---
sidebar_position: 3
title: Quickstart
---

# Quickstart

Get a public URL for your local MCP server in under a minute.

## 1. Create a tunnel

Open the [admin UI](https://mcp-gateway.info/admin), sign up, and click
**New tunnel**. You will get:

- `tunnelId` — your public subdomain
- `agentToken` — secret token for the agent (treat it like a password)

## 2. Install the CLI

```bash
npm install -g @alexdive/mcp-gw
```

(See [Installation](./installation) for platform-specific notes.)

## 3. Start your local MCP server

Any MCP server reachable over HTTP on a local port. If your MCP server
speaks **stdio** (most reference servers do), wrap it with `supergateway` —
see [Examples](./examples).

For this quickstart, assume it's listening on `http://localhost:8080`.

## 4. Connect the agent

```bash
mcp-gw connect \
  --tunnel-id <YOUR_TUNNEL_ID> \
  --token <YOUR_AGENT_TOKEN> \
  --target http://localhost:8080
```

The agent opens a WebSocket to `wss://<tunnelId>.mcp-gateway.info:3001`
and starts forwarding traffic to your local server.

## 5. Use the public URL

```
https://<YOUR_TUNNEL_ID>.mcp-gateway.info/
```

Paste this URL into Claude Desktop, Cursor, or any MCP client.
Every request will hit your local MCP server through the tunnel.

## Logs

Open the **Logs** tab in the admin UI to see live requests:
method, path, status code, duration, and body size.
