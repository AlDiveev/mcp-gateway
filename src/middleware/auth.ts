import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../types/errors';
import type { Role } from '../config/rbac';

export interface AuthService {
  verifyApiKey(apiKey: string): Promise<{ id: number; email: string; role: Role }>;
}

export function createAuthMiddleware(authService: AuthService) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const header = req.headers.authorization ?? '';
      if (!header.startsWith('Bearer ')) throw new UnauthorizedError();
      const user = await authService.verifyApiKey(header.slice(7).trim());
      req.userId = user.id;
      req.user = user;
      next();
    } catch (err) {
      next(err);
    }
  };
}
