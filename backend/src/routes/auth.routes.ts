import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { CONFIG } from '../config/index.js';
import { authenticateJwt, requireRole, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { AuditService } from '../services/AuditService.js';

const router = Router();

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    return;
  }

  try {
    const user = await db.queryOne(
      'SELECT id, username, email, password_hash, role, full_name, active FROM users WHERE username = $1',
      [username]
    );

    if (!user || !user.active) {
      await AuditService.logAction({
        username: username || 'Unknown',
        action: 'USER_LOGIN',
        details: 'Credenciales inválidas o usuario inactivo',
        status: 'FAILED',
        ipAddress: req.ip,
      });
      res.status(401).json({ error: 'Credenciales inválidas o usuario inactivo' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      await AuditService.logAction({
        userId: user.id,
        username: user.username,
        action: 'USER_LOGIN',
        details: 'Contraseña incorrecta',
        status: 'FAILED',
        ipAddress: req.ip,
      });
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    };

    const token = jwt.sign(payload, CONFIG.JWT_SECRET, {
      expiresIn: CONFIG.JWT_EXPIRES_IN as any,
    });

    await AuditService.logAction({
      userId: user.id,
      username: user.username,
      action: 'USER_LOGIN',
      details: `Inicio de sesión exitoso con rol ${user.role}`,
      status: 'SUCCESS',
      ipAddress: req.ip,
    });

    res.json({
      token,
      user: payload,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Current user profile
router.get('/me', authenticateJwt, (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});

// List users (Admin only)
router.get('/users', authenticateJwt, requireRole(['ADMIN']), async (req, res) => {
  try {
    const users = await db.query(
      'SELECT id, username, email, role, full_name, active, created_at FROM users ORDER BY created_at ASC'
    );
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
