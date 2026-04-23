import type { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import type { UserRepository } from '../repositories/user.repository';
import { hashPassword, verifyPassword } from '../lib/password';
import { UnauthorizedError, ConflictError } from '../types/errors';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export class AuthController {
  constructor(private readonly users: UserRepository) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = registerSchema.parse(req.body);
      const existing = await this.users.findByEmail(email);
      if (existing) throw new ConflictError('Email already registered');

      const apiKey = randomBytes(24).toString('hex');
      const { hash, salt } = hashPassword(password);
      const user = await this.users.create({
        email,
        apiKey,
        passwordHash: hash,
        passwordSalt: salt,
      });
      res.status(201).json({ userId: user.id, email: user.email, role: user.role, apiKey });
    } catch (err) {
      next(err);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const u = await this.users.findForLogin(email);
      if (!u || !verifyPassword(password, u.passwordHash, u.passwordSalt)) {
        throw new UnauthorizedError('Invalid credentials');
      }
      res.json({ userId: u.id, email: u.email, role: u.role, apiKey: u.apiKey });
    } catch (err) {
      next(err);
    }
  };

  me = (req: Request, res: Response): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    res.json(req.user);
  };
}
