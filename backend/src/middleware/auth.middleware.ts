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

export const authenticateJwt = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // If running in development without a token, allow fallback to a default admin for ease of initial testing
    if (CONFIG.NODE_ENV === 'development' && req.headers['x-bypass-auth'] === 'true') {
      req.user = {
        id: 'dev-admin',
        username: 'admin',
        role: 'ADMIN',
        email: 'admin@controltv.lan',
        fullName: 'Development Admin',
      };
      return next();
    }
    res.status(401).json({ error: 'Acceso no autorizado. Token JWT requerido.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, CONFIG.JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Acceso denegado. Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}`,
      });
      return;
    }

    next();
  };
};
