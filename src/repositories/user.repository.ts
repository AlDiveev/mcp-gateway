import { PrismaClient } from '@prisma/client';
import type { Role } from '../config/rbac';

export interface UserAuthRow {
  id: number;
  email: string;
  role: Role;
  passwordHash: string;
  passwordSalt: string;
  apiKey: string;
}

export interface UserRepository {
  findByApiKey(apiKey: string): Promise<{ id: number; email: string; role: Role } | null>;
  findForLogin(email: string): Promise<UserAuthRow | null>;
  findByEmail(email: string): Promise<{ id: number; email: string; role: Role } | null>;
  create(data: {
    email: string;
    apiKey: string;
    passwordHash: string;
    passwordSalt: string;
    role?: Role;
  }): Promise<{ id: number; email: string; role: Role }>;
  updateCredentials(id: number, data: { passwordHash: string; passwordSalt: string; role?: Role }): Promise<void>;
}

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByApiKey(apiKey: string) {
    const u = await this.prisma.user.findFirst({
      where: { apiKeyHash: apiKey },
      select: { id: true, email: true, role: true },
    });
    return u ? { ...u, role: u.role as Role } : null;
  }

  async findForLogin(email: string) {
    const u = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, passwordHash: true, passwordSalt: true, apiKeyHash: true },
    });
    return u ? { id: u.id, email: u.email, role: u.role as Role, passwordHash: u.passwordHash, passwordSalt: u.passwordSalt, apiKey: u.apiKeyHash } : null;
  }

  async findByEmail(email: string) {
    const u = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true },
    });
    return u ? { ...u, role: u.role as Role } : null;
  }

  async create(data: { email: string; apiKey: string; passwordHash: string; passwordSalt: string; role?: Role }) {
    const u = await this.prisma.user.create({
      data: {
        email: data.email,
        apiKeyHash: data.apiKey,
        passwordHash: data.passwordHash,
        passwordSalt: data.passwordSalt,
        role: data.role ?? 'USER',
      },
      select: { id: true, email: true, role: true },
    });
    return { ...u, role: u.role as Role };
  }

  async updateCredentials(id: number, data: { passwordHash: string; passwordSalt: string; role?: Role }): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash: data.passwordHash,
        passwordSalt: data.passwordSalt,
        ...(data.role ? { role: data.role } : {}),
      },
    });
  }
}
