---
sidebar_position: 5
title: Connect from Claude (UI)
---

# Connect your tunnel from Claude

This guide shows how to plug your MCP Gateway tunnel into **claude.ai** using
the Connectors UI — no JSON config, no desktop app.

## Prerequisites

- A running tunnel (see [Quickstart](./quickstart) and [Examples](./examples)).
- A public URL in the form `https://<TUNNEL_ID>.mcp-gateway.info/mcp`.
- A Claude account with access to **Connectors** (Pro / Team / Enterprise).

## Step 1 — Open Settings

In claude.ai, click your avatar in the bottom-left corner and pick **Settings**.
You'll land on the **General** tab.

![Settings → General in claude.ai](/img/claude-connect/01-settings.png)

## Step 2 — Go to Connectors

In the Settings sidebar, choose **Connectors**. You'll see Anthropic's built-in
integrations (GitHub, Gmail, Google Calendar, …) and, at the bottom, any
custom connectors you've already added.

![Connectors tab](/img/claude-connect/02-connectors.png)

> If you see a banner saying **"Connectors have moved to Customize"** — that's
> Claude rolling the feature into the new Customize page. Both routes still
> work. Custom connectors live under the same dialog described below.

## Step 3 — Add a custom connector

Click **Add custom connector** at the bottom of the list. A modal opens
with two fields:

- **Name** — any label, e.g. `MCP Gateway`.
- **Remote MCP server URL** — `https://<TUNNEL_ID>.mcp-gateway.info/mcp`

Leave **Advanced settings** alone — the Gateway tunnel doesn't need OAuth.

![Add custom connector modal with Name and Remote MCP server URL fields](/img/claude-connect/03-add-custom.png)

Click **Add**. Claude probes the URL, lists the tools your MCP server exposes,
and the connector appears in the list with a **Connect** button.
Hit **Connect** to enable it.

## Step 4 — Use it in a chat

Open a new chat. Click the tools icon below the prompt, toggle your custom
connector on, and Claude will route tool calls through
`https://<TUNNEL_ID>.mcp-gateway.info/mcp` for that conversation.

## Troubleshooting

- **"Failed to connect"** — confirm the URL ends with `/mcp` and that
  `mcp-gw connect` is still running on your machine. Hit the URL with
  `curl` to verify it's reachable.
- **No tools listed** — your local MCP server probably crashed.
  Check the terminal running `supergateway` (or your native server).
- **502 / 504 in claude.ai** — same as in the
  [main troubleshooting](./troubleshooting) page; the agent is offline
  or the local server didn't respond in time.

## Security notes

- Anyone who has your `https://<TUNNEL_ID>.mcp-gateway.info/mcp` URL can
  call your local MCP server. Treat it as a credential.
- If a URL leaks, rotate the tunnel in the
  [admin UI](https://mcp-gateway.info/admin) — the old `tunnelId`/token
  will stop working immediately.
