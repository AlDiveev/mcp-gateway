import { PrismaClient } from '@prisma/client';
import type { TunnelRepository } from '../services/tunnel.service';
import type { Tunnel, TunnelStatus } from '../types/tunnel';

type PrismaTunnel = {
  id: string;
  userId: number;
  authToken: string;
  status: string;
  createdAt: Date;
  lastConnectedAt: Date | null;
};

export class PrismaTunnelRepository implements TunnelRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string, userId: number): Promise<Tunnel | null> {
    const row = await this.prisma.tunnel.findFirst({ where: { id, userId } });
    return row ? this.toDomain(row) : null;
  }

  async findByAuthToken(authToken: string): Promise<Tunnel | null> {
    const row = await this.prisma.tunnel.findFirst({ where: { authToken } });
    return row ? this.toDomain(row) : null;
  }

  async findAllByUser(userId: number): Promise<Tunnel[]> {
    const rows = await this.prisma.tunnel.findMany({ where: { userId } });
    return rows.map((r) => this.toDomain(r));
  }

  async create(data: { userId: number; authToken: string }): Promise<Tunnel> {
    const row = await this.prisma.tunnel.create({ data });
    return this.toDomain(row);
  }

  async updateStatus(id: string, status: TunnelStatus, connectedAt?: Date): Promise<void> {
    await this.prisma.tunnel.update({
      where: { id },
      data: {
        status,
        ...(connectedAt ? { lastConnectedAt: connectedAt } : {}),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.tunnel.delete({ where: { id } });
  }

  private toDomain(row: PrismaTunnel): Tunnel {
    return {
      id: row.id,
      userId: row.userId,
      authToken: row.authToken,
      status: row.status as TunnelStatus,
      createdAt: row.createdAt,
      lastConnectedAt: row.lastConnectedAt,
    };
  }
}
