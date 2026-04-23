import { Router } from 'express';
import type { TunnelController } from '../controllers/tunnel.controller';

export function tunnelRouter(controller: TunnelController): Router {
  const router = Router();

  router.post('/', controller.create);

  return router;
}
