import { PrismaClient } from '@prisma/client';

export interface CreateRequestLogData {
  tunnelId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  rawRequest: string;
}

export interface RequestLogRepository {
  create(data: CreateRequestLogData): Promise<void>;
}

export class PrismaRequestLogRepository implements RequestLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateRequestLogData): Promise<void> {
    await this.prisma.requestLog.create({ data });
  }
}
