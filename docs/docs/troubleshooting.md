---
sidebar_position: 6
title: Troubleshooting
---

# Troubleshooting

## Agent won't connect

- Double-check `tunnelId` and `agentToken` (copy them from the admin UI).
- Make sure outbound `:3001` (WebSocket) is open.
- Run with verbose output: `mcp-gw connect --verbose ...`

## `502 Bad Gateway` on the public URL

The agent isn't connected, or it dropped the connection.
Check Terminal B where `mcp-gw connect` is running.

## `504 Gateway Timeout` on the public URL

The agent is connected, but your local MCP server didn't respond in time.

- Is the local server actually running on the port you passed to `--target`?
- Try `curl http://localhost:8080/` from your machine — does it respond?
- For stdio servers wrapped with `supergateway`, check that supergateway
  itself didn't crash (the subprocess may have exited).

## Tools don't appear in Claude / Cursor

- Make sure the URL ends with `/mcp` (the streamable-HTTP path).
- Hit `https://<tunnel>.mcp-gateway.info/mcp` with `curl` — you should
  get a JSON response, not 404.
- Restart the client after editing its config.

## `Cannot find module` when starting the CLI

Reinstall:

```bash
npm uninstall -g @alexdive/mcp-gw
npm install -g @alexdive/mcp-gw
```

## Docker volume permissions on Linux

If `docker run -v mcp-memory:/app/dist` fails with permission errors, run
docker as your user (add yourself to the `docker` group) and re-login.
