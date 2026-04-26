import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import { randomUUID } from 'crypto';
import { errorHandler } from './middleware/error-handler';
import { createAuthMiddleware, type AuthService } from './middleware/auth';
import { requirePermission } from './middleware/rbac';
import { tunnelRouter } from './routes/tunnel.routes';
import { adminRouter } from './routes/admin.routes';
import type { TunnelController } from './controllers/tunnel.controller';
import type { AdminController } from './controllers/admin.controller';
import type { AuthController } from './controllers/auth.controller';
import type { MeController } from './controllers/me.controller';
import type { TunnelService } from './services/tunnel.service';
import type { RequestLogRepository } from './repositories/request-log.repository';
import { logger } from './lib/logger';

export interface AppDependencies {
  authService: AuthService;
  tunnelController: TunnelController;
  adminController: AdminController;
  authController: AuthController;
  meController: MeController;
  tunnelService: TunnelService;
  requestLogRepo: RequestLogRepository;
}

export function createApp(deps: AppDependencies): Express {
  const app = express();

  app.use((req: Request, res: Response, next: NextFunction) => {
    const tunnelId = deps.tunnelService.extractTunnelIdFromHost(req.headers.host);
    if (!tunnelId) return next();

    const requestId = randomUUID();
    const startedAt = Date.now();

    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', async () => {
      const body = Buffer.concat(chunks);
      const reqPath = req.url?.split('?')[0] ?? '/';
      const rawRequest = `${req.method} ${req.url} HTTP/1.1\r\n${Object.entries(req.headers)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
        .join('\r\n')}\r\n\r\n${body.toString('utf8')}`;

      try {
        const response = await deps.tunnelService.forwardRequest(tunnelId, {
          method: req.method ?? 'GET',
          url: req.url ?? '/',
          headers: req.headers,
          body,
        });

        for (const [k, v] of Object.entries(response.headers)) {
          if (k.toLowerCase() === 'content-length' || k.toLowerCase() === 'transfer-encoding') continue;
          res.setHeader(k, v);
        }
        res.status(response.status).end(response.body);

        const durationMs = Date.now() - startedAt;
        logger.info('tunnel.request.completed', {
          requestId, tunnelId, method: req.method, path: reqPath,
          statusCode: response.status, durationMs, bodyBytes: body.length,
        });
        deps.requestLogRepo
          .create({ tunnelId, method: req.method ?? 'UNKNOWN', path: reqPath, statusCode: response.status, durationMs, rawRequest })
          .catch((err) => logger.error('request_log.persist_failed', { requestId, error: String(err) }));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const statusCode = message === 'tunnel request timed out' ? 504 : 502;
        const durationMs = Date.now() - startedAt;
        logger.warn('tunnel.request.failed', {
          requestId, tunnelId, method: req.method, path: reqPath,
          statusCode, durationMs, error: message,
        });
        deps.requestLogRepo
          .create({ tunnelId, method: req.method ?? 'UNKNOWN', path: reqPath, statusCode, durationMs, rawRequest })
          .catch((e) => logger.error('request_log.persist_failed', { requestId, error: String(e) }));
        res.status(statusCode).json({ error: message });
      }
    });
  });

  app.use(express.json());

  app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));

  const setPromptHeaders = (res: Response, filePath: string) => {
    if (filePath.endsWith('.prompt') || filePath.endsWith('llms.txt')) {
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300');
    }
  };
  app.use('/admin', express.static(path.join(process.cwd(), 'public', 'admin'), { setHeaders: setPromptHeaders }));
  app.use('/docs', express.static(path.join(process.cwd(), 'public', 'docs')));
  app.use(express.static(path.join(process.cwd(), 'public', 'admin'), { setHeaders: setPromptHeaders }));

  app.post('/api/auth/register', deps.authController.register);
  app.post('/api/auth/login', deps.authController.login);

  const auth = createAuthMiddleware(deps.authService);

  app.get('/api/me', auth, deps.authController.me);
  app.get('/api/me/tunnels', auth, requirePermission('tunnel:read:own'), deps.meController.listTunnels);
  app.get('/api/me/logs', auth, requirePermission('logs:read:own'), deps.meController.listLogs);

  app.use('/api/tunnels', auth, requirePermission('tunnel:create'), tunnelRouter(deps.tunnelController));

  app.use('/api/admin', auth, requirePermission('admin:users:read'), adminRouter(deps.adminController));

  app.use(errorHandler);

  return app;
}
