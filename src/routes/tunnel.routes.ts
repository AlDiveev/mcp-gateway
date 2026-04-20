import { Router } from 'express';
import type { TunnelController } from '../controllers/tunnel.controller';

export function tunnelRouter(controller: TunnelController): Router {
  const router = Router();

  router.post('/', controller.create);
  router.get('/', controller.list);
  router.delete('/:id', controller.delete);
  router.get('/:id/logs', controller.getLogs);

  return router;
}
