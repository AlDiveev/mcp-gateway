#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const https = require('https');
const readline = require('readline');
const WebSocket = require('ws');

const GATEWAY_URL = process.env.GATEWAY_URL ?? 'https://mcp-gateway.info';
const CONFIG_DIR = process.env.MCP_GATEWAY_HOME ?? path.join(os.homedir(), '.mcp-gateway');
const CREDENTIALS_FILE = path.join(CONFIG_DIR, 'credentials.json');

try {
  const gwHost = new URL(GATEWAY_URL).hostname;
  if (GATEWAY_URL.startsWith('https://') && (gwHost === 'localhost' || gwHost === '127.0.0.1' || gwHost === '::1')) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }
} catch {}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const opts = {};
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = rest[i + 1];
      opts[key] = value;
      i++;
    }
  }
  return { command, opts };
}

function loadCredentials() {
  if (!fs.existsSync(CREDENTIALS_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function saveCredentials(data) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
}

function printCreds(c, adminUrl, title) {
  const line = '─'.repeat(60);
  console.log(`\n${line}\n  ${title}\n${line}`);
  console.log(`  Email:     ${c.email}`);
  console.log(`  Password:  ${c.password}`);
  console.log(`  User ID:   ${c.userId}`);
  console.log(`  Admin UI:  ${adminUrl}`);
  console.log(`  Saved to:  ${CREDENTIALS_FILE}`);
  console.log(`${line}\n`);
}

async function ensureApiKey() {
  const adminUrl = `${GATEWAY_URL.replace(/\/$/, '')}/admin/`;
  const existing = loadCredentials();
  if (existing?.apiKey) {
    printCreds(existing, adminUrl, 'Using saved credentials');
    return existing.apiKey;
  }

  const email = `cli-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@cli.local`;
  const password = require('crypto').randomBytes(16).toString('hex');

  console.log('No credentials found. Registering...');
  const res = await fetch(`${GATEWAY_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Registration failed: HTTP ${res.status} ${text}`);
    process.exit(1);
  }
  const data = await res.json();
  saveCredentials({ userId: data.userId, email, password, apiKey: data.apiKey, gateway: GATEWAY_URL });

  printCreds({ email, password, userId: data.userId }, adminUrl, 'Account registered');
  return data.apiKey;
}

async function request(apiKey, method, path, body) {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    console.error(`HTTP ${res.status}:`, data);
    process.exit(1);
  }
  return data;
}

function prompt(question, defaultValue) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const suffix = defaultValue ? ` [${defaultValue}]` : '';
  return new Promise((resolve) => {
    rl.question(`${question}${suffix}: `, (answer) => {
      rl.close();
      resolve((answer || '').trim() || defaultValue || '');
    });
  });
}

function normalizeTarget(input) {
  let s = String(input || '').trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `http://${s}`;
  try {
    const u = new URL(s);
    return u.origin;
  } catch {
    return null;
  }
}

function sanitizeRequestHeaders(headers) {
  const out = {};
  for (const [k, v] of Object.entries(headers || {})) {
    const key = k.toLowerCase();
    if (key === 'host' || key === 'connection' || key === 'content-length') continue;
    out[key] = Array.isArray(v) ? v.join(', ') : v;
  }
  return out;
}

function forwardToTarget(targetOrigin, envelope) {
  return new Promise((resolve) => {
    const { method, url, headers, body } = envelope;
    const target = new URL(url, targetOrigin);
    const lib = target.protocol === 'https:' ? https : http;
    const bodyBuf = body ? Buffer.from(body, 'base64') : null;
    const outHeaders = { ...sanitizeRequestHeaders(headers), host: target.host };
    if (bodyBuf && bodyBuf.length) outHeaders['content-length'] = String(bodyBuf.length);
    const opts = {
      method: method || 'GET',
      hostname: target.hostname,
      port: target.port || (target.protocol === 'https:' ? 443 : 80),
      path: target.pathname + target.search,
      headers: outHeaders,
    };
    const started = Date.now();
    const req = lib.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        const ms = Date.now() - started;
        console.log(`  → ${opts.method} ${target.pathname}${target.search} ${res.statusCode} (${ms}ms, ${buf.length}b)`);
        resolve({
          status: res.statusCode || 502,
          headers: res.headers,
          body: buf.toString('base64'),
        });
      });
    });
    req.on('error', (err) => {
      const detail = err.code ? `${err.code} ${err.message}` : (err.message || err.toString());
      console.error(`  → forward error [${opts.method} ${target.href}]: ${detail}`);
      resolve({
        status: 502,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
        body: Buffer.from(`agent forward error: ${detail}`, 'utf8').toString('base64'),
      });
    });
    if (bodyBuf && bodyBuf.length) req.write(bodyBuf);
    req.end();
  });
}

function probeLocalMcp(targetOrigin) {
  const mcpUrl = new URL('/mcp', targetOrigin);
  const lib = mcpUrl.protocol === 'https:' ? https : http;
  const payload = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'mcp-gateway-cli', version: '0' },
    },
  });
  const opts = {
    method: 'POST',
    hostname: mcpUrl.hostname,
    port: mcpUrl.port || (mcpUrl.protocol === 'https:' ? 443 : 80),
    path: mcpUrl.pathname,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'Content-Length': Buffer.byteLength(payload),
    },
    timeout: 5000,
  };

  return new Promise((resolve) => {
    const req = lib.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        const ok = res.statusCode >= 200 && res.statusCode < 300 && /"jsonrpc"\s*:\s*"2\.0"/.test(body);
        resolve({ ok, status: res.statusCode, reason: ok ? null : `HTTP ${res.statusCode}, body not a valid JSON-RPC response` });
      });
    });
    req.on('timeout', () => {
      req.destroy(new Error('connection timed out after 5s'));
    });
    req.on('error', (err) => {
      const code = err.code ? `${err.code}: ` : '';
      resolve({ ok: false, status: 0, reason: `${code}${err.message}` });
    });
    req.write(payload);
    req.end();
  });
}

function printProbeError(targetOrigin, reason) {
  const line = '─'.repeat(68);
  console.error(`\n${line}`);
  console.error('  ✗ Local MCP server unreachable');
  console.error(line);
  console.error(`  Target:  ${targetOrigin}/mcp`);
  console.error(`  Reason:  ${reason}`);
  console.error('');
  console.error('  Check:');
  console.error('    • host/port correct? (default: http://localhost:8080)');
  console.error('    • is supergateway (or your MCP HTTP server) running?');
  console.error('    • does it expose /mcp over Streamable HTTP?');
  console.error(`${line}\n`);
}

function printClaudeMcpHint(tunnelId, publicUrl) {
  const mcpUrl = `${publicUrl.replace(/\/$/, '')}/mcp`;
  const name = `mcp-${tunnelId.slice(0, 8)}`;

  const line = '─'.repeat(68);
  console.log(`\n${line}`);
  console.log('  Connect to Claude via the web UI (claude.ai)');
  console.log(line);
  console.log('  1. Open https://claude.ai/ and sign in (Pro/Team/Enterprise).');
  console.log('  2. Go to Settings → Connectors (or Settings → Integrations).');
  console.log('  3. Click "Add custom connector" / "Add MCP server".');
  console.log('  4. Fill in the fields:');
  console.log('');
  console.log(`       Name:  ${name}`);
  console.log(`       URL:   ${mcpUrl}`);
  console.log('');
  console.log('  5. Save. In a new chat, enable the connector from the tools menu.');
  console.log('');
}

function connectWs(baseWsUrl, token, targetOrigin) {
  const u = new URL(baseWsUrl);
  u.searchParams.set('token', token);
  const wsUrl = u.toString();
  console.log(`\nConnecting to ${wsUrl} ...`);
  console.log(`Forwarding to ${targetOrigin}\n`);

  return new Promise((resolve, reject) => {
    const u2 = new URL(wsUrl);
    const insecure = u2.protocol === 'wss:' && /(^|\.)localhost$|^127\.0\.0\.1$|^::1$/.test(u2.hostname);
    const ws = new WebSocket(wsUrl, insecure ? { rejectUnauthorized: false } : undefined);
    ws.on('open', () => console.log('WS connected. Press Ctrl+C to exit.'));
    ws.on('message', async (data) => {
      let envelope;
      try {
        envelope = JSON.parse(data.toString('utf8'));
      } catch {
        console.error('← invalid JSON envelope');
        return;
      }
      if (envelope.type !== 'request' || !envelope.id) return;
      console.log(`\n← ${envelope.method} ${envelope.url}`);
      const response = await forwardToTarget(targetOrigin, envelope);
      ws.send(JSON.stringify({ type: 'response', id: envelope.id, ...response }));
    });
    ws.on('close', (code, reason) => {
      console.log(`WS closed: ${code} ${reason.toString()}`);
      resolve();
    });
    ws.on('error', (err) => {
      console.error('WS error:', err.message);
      reject(err);
    });
  });
}

async function main() {
  const { command, opts } = parseArgs(process.argv.slice(2));

  if (!command) {
    console.log(`Usage:
  mcp-gw <command> [options]

Commands:
  create [--target <url>]       Register (if needed) and open tunnel
  whoami                        Show stored credentials

Env:
  GATEWAY_URL                   Gateway base URL (default: https://mcp-gateway.info)
  MCP_GATEWAY_HOME              Config dir (default: ~/.mcp-gateway)`);
    process.exit(0);
  }

  const apiKey = await ensureApiKey();

  switch (command) {
    case 'create': {
      let targetOrigin = normalizeTarget(opts.target);
      while (!targetOrigin) {
        const answer = await prompt('Forward incoming requests to', 'http://localhost:8080');
        targetOrigin = normalizeTarget(answer);
        if (!targetOrigin) console.log('  invalid URL, try again');
      }
      process.stdout.write(`Probing local MCP at ${targetOrigin}/mcp ... `);
      const probe = await probeLocalMcp(targetOrigin);
      if (!probe.ok) {
        console.log('fail');
        printProbeError(targetOrigin, probe.reason);
        process.exit(1);
      }
      console.log('ok');

      const tunnel = await request(apiKey, 'POST', '/api/tunnels', {});
      console.log('Tunnel ready:');
      console.log(`  id:         ${tunnel.id}`);
      console.log(`  publicUrl:  ${tunnel.publicUrl}`);
      console.log(`  wsUrl:      ${tunnel.wsUrl}`);
      console.log(`  target:     ${targetOrigin}`);
      printClaudeMcpHint(tunnel.id, tunnel.publicUrl);
      await connectWs(tunnel.wsUrl, tunnel.authToken, targetOrigin);
      break;
    }
    case 'whoami': {
      console.log(loadCredentials());
      break;
    }
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
