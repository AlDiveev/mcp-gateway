import { Router } from 'express';
import type { AdminController } from '../controllers/admin.controller';

export function adminRouter(controller: AdminController): Router {
  const router = Router();

  router.get('/stats', controller.getStats);
  router.get('/connections', controller.getConnections);
  router.get('/users', controller.listUsers);
  router.get('/tunnels', controller.listTunnels);
  router.get('/logs', controller.listLogs);

  return router;
}
