import type { Request, Response, NextFunction } from 'express';
import { hasPermission, type Permission } from '../config/rbac';
import { UnauthorizedError } from '../types/errors';

export function requirePermission(perm: Permission) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !hasPermission(req.user.role, perm)) {
      next(new UnauthorizedError('Forbidden'));
      return;
    }
    next();
  };
}
