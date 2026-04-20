import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../types/errors';

export interface AuthService {
  verifyApiKey(apiKey: string): Promise<string>;
}

export function createAuthMiddleware(authService: AuthService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const header = req.headers.authorization ?? '';
      if (!header.startsWith('Bearer ')) throw new UnauthorizedError();
      req.userId = await authService.verifyApiKey(header.slice(7).trim());
      next();
    } catch (err) {
      next(err);
    }
  };
}
