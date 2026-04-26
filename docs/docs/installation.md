---
sidebar_position: 2
title: Installation
---

# Installation

## Requirements

- **Node.js 20+** (22 recommended)
- **npm** (ships with Node)
- Outbound access to `mcp-gateway.info` on ports `3000` (HTTP) and `3001` (WS)

## Install the CLI

The CLI is published as `@alexdive/mcp-gw`.

### macOS (Homebrew)

```bash
# Install Node.js if you don't have it
brew install node

# Install the CLI globally
npm install -g @alexdive/mcp-gw
```

### Linux (Debian / Ubuntu)

```bash
# Install Node.js 22.x
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install the CLI globally
sudo npm install -g @alexdive/mcp-gw
```

### Windows (PowerShell)

```powershell
# Install Node.js via winget
winget install OpenJS.NodeJS.LTS

# Install the CLI globally
npm install -g @alexdive/mcp-gw
```

## Verify

```bash
mcp-gw --help
```

If you see the help output, you're good to go.

## Next

Head to [Quickstart](./quickstart) to spin up your first tunnel.
