import express, { type Express } from 'express';
import { errorHandler } from './middleware/error-handler';
import { createAuthMiddleware, type AuthService } from './middleware/auth';
import { tunnelRouter } from './routes/tunnel.routes';
import type { TunnelController } from './controllers/tunnel.controller';

export interface AppDependencies {
  authService: AuthService;
  tunnelController: TunnelController;
}

export function createApp(deps: AppDependencies): Express {
  const app = express();

  app.use(express.json());

  app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));

  const auth = createAuthMiddleware(deps.authService);
  app.use('/api/tunnels', auth, tunnelRouter(deps.tunnelController));

  app.use(errorHandler);

  return app;
}
