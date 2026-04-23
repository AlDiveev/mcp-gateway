import 'express';
import type { Role } from '../config/rbac';

declare module 'express-serve-static-core' {
  interface Request {
    userId: number;
    user?: { id: number; email: string; role: Role };
  }
}
