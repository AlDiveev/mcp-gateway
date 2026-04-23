import type { Request, Response, NextFunction } from 'express';
import type { TunnelService } from '../services/tunnel.service';
import type { CreateTunnelResponse, Tunnel } from '../types/tunnel';
import config from '../config/config';

export class TunnelController {
  constructor(private readonly tunnelService: TunnelService) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tunnel = await this.tunnelService.create(req.userId, {});
      res.status(201).json(this.toCreateResponse(tunnel));
    } catch (err) {
      next(err);
    }
  };

  private buildPublicUrl(id: string): string {
    return this.withSubdomain(config.publicUrl, id);
  }

  private buildWsUrl(id: string): string {
    return this.withSubdomain(config.wsPublicUrl, id);
  }

  private withSubdomain(base: string, id: string): string {
    const url = new URL(base);
    url.hostname = `${id}.${url.hostname}`;
    return url.toString();
  }

  private toCreateResponse(tunnel: Tunnel): CreateTunnelResponse {
    return {
      id: tunnel.id,
      publicUrl: this.buildPublicUrl(tunnel.id),
      status: tunnel.status,
      createdAt: tunnel.createdAt.toISOString(),
      lastConnectedAt: tunnel.lastConnectedAt?.toISOString() ?? null,
      authToken: tunnel.authToken,
      wsUrl: this.buildWsUrl(tunnel.id),
    };
  }
}
