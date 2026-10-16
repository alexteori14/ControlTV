import { Router } from 'express';
import { AuditService } from '../services/AuditService.js';
import { authenticateJwt, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// Get audit logs (Admin and Supervisor)
router.get('/logs', authenticateJwt, requireRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string || '100', 10);
    const offset = parseInt(req.query.offset as string || '0', 10);
    const deviceId = req.query.deviceId as string | undefined;
    const action = req.query.action as string | undefined;

    const logs = await AuditService.getAuditLogs(limit, offset, { deviceId, action });
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get command execution history
router.get('/history', authenticateJwt, async (req, res) => {
  try {
    const deviceId = req.query.deviceId as string | undefined;
    const limit = parseInt(req.query.limit as string || '50', 10);

    const history = await AuditService.getCommandHistory(deviceId, limit);
    res.json({ history });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
