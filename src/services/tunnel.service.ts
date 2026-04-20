import { ConflictError, NotFoundError } from '../types/errors';
import type { CreateTunnelDto, Tunnel, TunnelStatus } from '../types/tunnel';
import type { RequestLog } from '../types/request-log';

export interface TunnelRepository {
  findById(id: string, userId: string): Promise<Tunnel | null>;
  findBySubdomain(subdomain: string): Promise<Tunnel | null>;
  findAllByUser(userId: string): Promise<Tunnel[]>;
  create(data: { subdomain: string; userId: string; authToken: string }): Promise<Tunnel>;
  updateStatus(id: string, status: TunnelStatus, connectedAt?: Date): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface RequestLogRepository {
  findByTunnel(tunnelId: string, limit: number): Promise<RequestLog[]>;
}

export interface TokenGenerator {
  subdomain(): string;
  authToken(): string;
}

export interface BaseDomainProvider {
  baseDomain(): string;
}

export class TunnelService {
  constructor(
    private readonly repo: TunnelRepository,
    private readonly logRepo: RequestLogRepository,
    private readonly tokens: TokenGenerator,
    private readonly domain: BaseDomainProvider,
  ) {}

  async create(userId: string, dto: CreateTunnelDto): Promise<Tunnel> {
    const subdomain = await this.resolveSubdomain(dto.subdomain);
    return this.repo.create({
      subdomain,
      userId,
      authToken: this.tokens.authToken(),
    });
  }

  listByUser(userId: string): Promise<Tunnel[]> {
    return this.repo.findAllByUser(userId);
  }

  async getOwned(id: string, userId: string): Promise<Tunnel> {
    const tunnel = await this.repo.findById(id, userId);
    if (!tunnel) throw new NotFoundError('Tunnel not found');
    return tunnel;
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.getOwned(id, userId);
    await this.repo.delete(id);
  }

  async getLogs(id: string, userId: string, limit: number): Promise<RequestLog[]> {
    await this.getOwned(id, userId);
    return this.logRepo.findByTunnel(id, limit);
  }

  publicUrl(subdomain: string): string {
    return `https://${subdomain}.${this.domain.baseDomain()}`;
  }

  private async resolveSubdomain(requested?: string): Promise<string> {
    if (requested) {
      if (await this.repo.findBySubdomain(requested)) {
        throw new ConflictError('Subdomain already taken');
      }
      return requested;
    }

    for (let i = 0; i < 5; i++) {
      const candidate = this.tokens.subdomain();
      if (!(await this.repo.findBySubdomain(candidate))) return candidate;
    }

    throw new ConflictError('Unable to allocate subdomain, try again');
  }
}
