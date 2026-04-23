import type { CreateTunnelDto, Tunnel, TunnelStatus } from '../types/tunnel';

import { randomBytes, randomUUID } from 'crypto';
import type { IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

export interface TunnelHttpRequest {
    method: string;
    url: string;
    headers: Record<string, string | string[] | undefined>;
    body: Buffer;
}

export interface TunnelHttpResponse {
    status: number;
    headers: Record<string, string | string[]>;
    body: Buffer;
}

interface PendingRequest {
    resolve: (res: TunnelHttpResponse) => void;
    reject: (err: Error) => void;
    timer: NodeJS.Timeout;
}

export interface TunnelRepository {
    findById(id: string, userId: number): Promise<Tunnel | null>;

    findByAuthToken(authToken: string): Promise<Tunnel | null>;

    findAllByUser(userId: number): Promise<Tunnel[]>;

    create(data: { userId: number; authToken: string }): Promise<Tunnel>;

    updateStatus(id: string, status: TunnelStatus, connectedAt?: Date): Promise<void>;

    delete(id: string): Promise<void>;
}

export class TunnelService {
    private static instance: TunnelService | null = null;

    public readonly ws: WebSocketServer;
    private readonly connections = new Map<string, WebSocket>();
    private readonly pending = new Map<string, PendingRequest>();
    private readonly requestTimeoutMs: number;

    private constructor(private readonly repo: TunnelRepository, wsPort: number, requestTimeoutMs: number) {
        this.ws = new WebSocketServer({ port: wsPort });
        this.ws.on('connection', (ws, req) => this.handleConnection(ws, req));
        this.requestTimeoutMs = requestTimeoutMs;
    }

    static getInstance(repo: TunnelRepository, wsPort = 3001, requestTimeoutMs = 30_000): TunnelService {
        if (!TunnelService.instance) {
            TunnelService.instance = new TunnelService(repo, wsPort, requestTimeoutMs);
        }
        return TunnelService.instance;
    }

    async create(userId: number, _dto: CreateTunnelDto): Promise<Tunnel> {
        const existing = await this.repo.findAllByUser(userId);
        if (existing.length > 0) {
            return existing[0]!;
        }

        return this.repo.create({
            userId,
            authToken: randomBytes(32).toString('hex'),
        });
    }

    private async handleConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
        console.log(`[ws] incoming host=${req.headers.host} url=${req.url}`);

        const tunnelId = this.extractTunnelId(req.headers.host);
        if (!tunnelId) {
            console.log('[ws] reject: tunnel id not found in host');
            ws.close(4400, 'tunnel id not found in host');
            return;
        }

        const url = new URL(req.url ?? '', 'http://localhost');
        const token = url.searchParams.get('token');
        if (!token) {
            console.log(`[ws] reject ${tunnelId}: missing token`);
            ws.close(4401, 'missing token');
            return;
        }

        const tunnel = await this.repo.findByAuthToken(token);
        if (!tunnel || tunnel.id !== tunnelId) {
            console.log(`[ws] reject ${tunnelId}: invalid token`);
            ws.close(4403, 'invalid token');
            return;
        }

        console.log(`[ws] connected tunnel=${tunnel.id}`);
        this.connections.set(tunnel.id, ws);
        await this.repo.updateStatus(tunnel.id, 'active', new Date());

        ws.on('message', (data) => this.handleAgentMessage(tunnel.id, data));

        ws.on('close', () => {
            console.log(`[ws] closed tunnel=${tunnel.id}`);
            this.connections.delete(tunnel.id);
            this.rejectPendingForTunnel(tunnel.id, new Error('tunnel disconnected'));
            void this.repo.updateStatus(tunnel.id, 'inactive');
        });
    }

    private handleAgentMessage(tunnelId: string, data: Buffer | ArrayBuffer | Buffer[]): void {
        const buf = Array.isArray(data) ? Buffer.concat(data) : Buffer.from(data as ArrayBuffer);
        let msg: { type?: string; id?: string; status?: number; headers?: Record<string, string | string[]>; body?: string };
        try {
            msg = JSON.parse(buf.toString('utf8'));
        } catch {
            console.warn(`[ws] tunnel=${tunnelId} invalid JSON from agent`);
            return;
        }
        if (msg.type !== 'response' || !msg.id) return;
        const pending = this.pending.get(msg.id);
        if (!pending) return;
        this.pending.delete(msg.id);
        clearTimeout(pending.timer);
        pending.resolve({
            status: msg.status ?? 502,
            headers: msg.headers ?? {},
            body: msg.body ? Buffer.from(msg.body, 'base64') : Buffer.alloc(0),
        });
    }

    private rejectPendingForTunnel(tunnelId: string, err: Error): void {
        for (const [id, pending] of this.pending) {
            if (id.startsWith(`${tunnelId}:`)) {
                clearTimeout(pending.timer);
                this.pending.delete(id);
                pending.reject(err);
            }
        }
    }

    listActiveConnections(): { tunnelId: string; readyState: number }[] {
        return Array.from(this.connections.entries()).map(([tunnelId, ws]) => ({
            tunnelId,
            readyState: ws.readyState,
        }));
    }

    forwardRequest(tunnelId: string, req: TunnelHttpRequest): Promise<TunnelHttpResponse> {
        const ws = this.connections.get(tunnelId);
        if (!ws || ws.readyState !== ws.OPEN) {
            return Promise.reject(new Error('tunnel not connected'));
        }

        const id = `${tunnelId}:${randomUUID()}`;
        const envelope = {
            type: 'request',
            id,
            method: req.method,
            url: req.url,
            headers: req.headers,
            body: req.body.toString('base64'),
        };

        return new Promise<TunnelHttpResponse>((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error('tunnel request timed out'));
            }, this.requestTimeoutMs);
            this.pending.set(id, { resolve, reject, timer });
            ws.send(JSON.stringify(envelope), (err) => {
                if (err) {
                    clearTimeout(timer);
                    this.pending.delete(id);
                    reject(err);
                }
            });
        });
    }

    extractTunnelIdFromHost(host: string | undefined): string | null {
        return this.extractTunnelId(host);
    }

    private extractTunnelId(host: string | undefined): string | null {
        if (!host) return null;
        const hostname = host.split(':')[0]!;
        const rootDomain = process.env.ROOT_DOMAIN;
        if (!rootDomain) {
            const parts = hostname.split('.');
            if (parts.length < 2) return null;
            return parts[0] || null;
        }
        if (hostname === rootDomain) return null;
        const suffix = `.${rootDomain}`;
        if (!hostname.endsWith(suffix)) return null;
        const sub = hostname.slice(0, -suffix.length);
        if (!sub || sub.includes('.')) return null;
        return sub;
    }
}
