import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import config from '../config/config';

const logsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export class MeController {
  constructor(private readonly prisma: PrismaClient) {}

  listTunnels = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tunnels = await this.prisma.tunnel.findMany({
        where: { userId: req.userId },
        select: { id: true, authToken: true, status: true, createdAt: true, lastConnectedAt: true },
        orderBy: { createdAt: 'desc' },
      });
      const withUrls = tunnels.map((t) => ({
        ...t,
        publicUrl: this.withSubdomain(config.publicUrl, t.id),
        wsUrl: this.withSubdomain(config.wsPublicUrl, t.id, config.wsPath) + `?token=${encodeURIComponent(t.authToken)}`,
      }));
      res.json(withUrls);
    } catch (err) {
      next(err);
    }
  };

  listLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { limit, offset } = logsQuery.parse(req.query);
      const logs = await this.prisma.requestLog.findMany({
        where: { tunnel: { userId: req.userId } },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      });
      res.json(logs);
    } catch (err) {
      next(err);
    }
  };

  private withSubdomain(base: string, id: string, pathname?: string): string {
    const url = new URL(base);
    url.hostname = `${id}.${url.hostname}`;
    if (pathname) url.pathname = pathname;
    return url.toString();
  }
}
