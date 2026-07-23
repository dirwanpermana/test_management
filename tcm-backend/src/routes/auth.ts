import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { authenticate, signToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { findUserByUsername, listUsersByRole } from '../services/userService';

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

authRouter.post('/auth/login', asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Payload tidak valid', errors: parsed.error.flatten() });
  }
  const { username, password } = parsed.data;

  const user = await findUserByUsername(username);
  if (!user) return res.status(401).json({ message: 'Username atau password salah' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ message: 'Username atau password salah' });

  const role = user.role_code as 'QA' | 'DEV';
  const token = signToken({ sub: user.id, role, username: user.username });

  return res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      email: user.email,
      role,
    },
  });
}));

export const usersRouter = Router();

usersRouter.get('/users', authenticate, asyncHandler(async (req, res) => {
  const role = typeof req.query.role === 'string' ? req.query.role : undefined;
  const users = await listUsersByRole(role);
  return res.json(users);
}));
