import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { JwtPayload, Role } from '../types';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: token tidak ditemukan' });
  }
  const token = header.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.auth = payload;
    return next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized: token tidak valid atau kedaluwarsa' });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) return res.status(401).json({ message: 'Unauthorized' });
    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ message: `Forbidden: aksi ini hanya untuk role ${roles.join('/')}` });
    }
    return next();
  };
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: (process.env.JWT_EXPIRES_IN ?? '15m') as jwt.SignOptions['expiresIn'] });
}
