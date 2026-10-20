import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CONFIG } from '../config/index.js';
import { UserRole } from '../types/index.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: UserRole;
    email: string;
    fullName: string;
  };
}

const DEFAULT_ADMIN = {
  id: 'admin-local',
  username: 'admin',
  role: 'ADMIN' as UserRole,
  email: 'admin@controltv.lan',
  fullName: 'Operador NOC',
};

export const authenticateJwt = (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, CONFIG.JWT_SECRET) as any;
      req.user = decoded;
      return next();
    } catch {
      // Fallback to default admin user when login is disabled
    }
  }

  req.user = DEFAULT_ADMIN;
  next();
};

export const requireRole = (_allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      req.user = DEFAULT_ADMIN;
    }
    next();
  };
};
