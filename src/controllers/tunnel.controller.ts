import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import type { TunnelService } from '../services/tunnel.service';
import type { CreateTunnelResponse, TunnelResponse } from '../types/tunnel';
import type { Tunnel } from '../types/tunnel';

const createTunnelSchema = z.object({
  subdomain: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/)
    .optional(),
});

const logsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export class TunnelController {
  constructor(private readonly tunnelService: TunnelService) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = createTunnelSchema.parse(req.body);
      const tunnel = await this.tunnelService.create(req.userId, body);
      res.status(201).json(this.toCreateResponse(tunnel));
    } catch (err) {
      next(err);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tunnels = await this.tunnelService.listByUser(req.userId);
      res.json(tunnels.map((t) => this.toResponse(t)));
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.tunnelService.delete(req.params['id'] as string, req.userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  getLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { limit } = logsQuerySchema.parse(req.query);
      const logs = await this.tunnelService.getLogs(req.params['id'] as string, req.userId, limit);
      res.json(logs);
    } catch (err) {
      next(err);
    }
  };

  private toResponse(tunnel: Tunnel): TunnelResponse {
    return {
      id: tunnel.id,
      subdomain: tunnel.subdomain,
      publicUrl: this.tunnelService.publicUrl(tunnel.subdomain),
      status: tunnel.status,
      createdAt: tunnel.createdAt.toISOString(),
      lastConnectedAt: tunnel.lastConnectedAt?.toISOString() ?? null,
    };
  }

  private toCreateResponse(tunnel: Tunnel): CreateTunnelResponse {
    return {
      ...this.toResponse(tunnel),
      authToken: tunnel.authToken,
    };
  }
}
