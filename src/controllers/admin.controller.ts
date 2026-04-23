import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import type { TunnelService } from '../services/tunnel.service';

const listLogsQuery = z.object({
  tunnelId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export class AdminController {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tunnelService: TunnelService,
  ) {}

  getConnections = (_req: Request, res: Response): void => {
    res.json(this.tunnelService.listActiveConnections());
  };

  getStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const since = new Date(Date.now() - 60 * 60 * 1000);
      const [users, tunnels, activeTunnels, requestsLastHour, totalRequests] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.tunnel.count(),
        this.prisma.tunnel.count({ where: { status: 'active' } }),
        this.prisma.requestLog.count({ where: { timestamp: { gte: since } } }),
        this.prisma.requestLog.count(),
      ]);
      res.json({
        users,
        tunnels,
        activeTunnels,
        activeConnections: this.tunnelService.listActiveConnections().length,
        requestsLastHour,
        totalRequests,
      });
    } catch (err) {
      next(err);
    }
  };

  listUsers = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const users = await this.prisma.user.findMany({
        select: { id: true, email: true, role: true, createdAt: true },
        orderBy: { id: 'asc' },
      });
      res.json(users);
    } catch (err) {
      next(err);
    }
  };

  listTunnels = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tunnels = await this.prisma.tunnel.findMany({
        select: {
          id: true,
          userId: true,
          status: true,
          createdAt: true,
          lastConnectedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json(tunnels);
    } catch (err) {
      next(err);
    }
  };

  listLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tunnelId, limit, offset } = listLogsQuery.parse(req.query);
      const logs = await this.prisma.requestLog.findMany({
        where: tunnelId ? { tunnelId } : undefined,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      });
      res.json(logs);
    } catch (err) {
      next(err);
    }
  };
}
