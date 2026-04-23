import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomBytes } from 'crypto';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import { createApp } from './app';
import config from './config/config';
import { TunnelController } from './controllers/tunnel.controller';
import { AdminController } from './controllers/admin.controller';
import { AuthController } from './controllers/auth.controller';
import { MeController } from './controllers/me.controller';
import { PrismaTunnelRepository } from './repositories/tunnel.repository';
import { PrismaRequestLogRepository } from './repositories/request-log.repository';
import { PrismaUserRepository } from './repositories/user.repository';
import { TunnelService } from './services/tunnel.service';
import { UnauthorizedError } from './types/errors';
import { hashPassword } from './lib/password';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const userRepo = new PrismaUserRepository(prisma);
const tunnelRepo = new PrismaTunnelRepository(prisma);
const requestLogRepo = new PrismaRequestLogRepository(prisma);
const tunnelTls = config.tlsKeyPath && config.tlsCertPath
  ? { key: fs.readFileSync(config.tlsKeyPath), cert: fs.readFileSync(config.tlsCertPath) }
  : undefined;
const tunnelService = TunnelService.getInstance(tunnelRepo, config.wsPort, 30_000, tunnelTls);

const authService = {
  verifyApiKey: async (key: string) => {
    const u = await userRepo.findByApiKey(key);
    if (!u) throw new UnauthorizedError();
    return u;
  },
};

const authController = new AuthController(userRepo);
const meController = new MeController(prisma);
const tunnelController = new TunnelController(tunnelService);
const adminController = new AdminController(prisma, tunnelService);

const app = createApp({
  authService,
  authController,
  meController,
  tunnelController,
  adminController,
  tunnelService,
  requestLogRepo,
});

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@admin.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin';

async function ensureAdminUser(): Promise<void> {
  const existing = await userRepo.findByEmail(ADMIN_EMAIL);
  const { hash, salt } = hashPassword(ADMIN_PASSWORD);
  if (existing) {
    await userRepo.updateCredentials(existing.id, { passwordHash: hash, passwordSalt: salt, role: 'ADMIN' });
    return;
  }
  await userRepo.create({
    email: ADMIN_EMAIL,
    apiKey: randomBytes(24).toString('hex'),
    passwordHash: hash,
    passwordSalt: salt,
    role: 'ADMIN',
  });
}

function createServer() {
  if (config.tlsKeyPath && config.tlsCertPath) {
    return https.createServer(
      {
        key: fs.readFileSync(config.tlsKeyPath),
        cert: fs.readFileSync(config.tlsCertPath),
      },
      app,
    );
  }
  return http.createServer(app);
}

ensureAdminUser().then(() => {
  const server = createServer();
  const scheme = config.tlsKeyPath && config.tlsCertPath ? 'https' : 'http';
  server.listen(config.port, () => {
    console.log(`Gateway ${scheme.toUpperCase()} on port ${config.port}`);
    console.log(`Gateway WS   on port ${tunnelService.ws.options.port}`);
    console.log(`Admin seeded: ${ADMIN_EMAIL}`);
  });
});
