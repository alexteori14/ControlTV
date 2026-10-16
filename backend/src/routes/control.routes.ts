import { Router } from 'express';
import { CommandExecutorService } from '../services/CommandExecutorService.js';
import { authenticateJwt, AuthenticatedRequest } from '../middleware/auth.middleware.js';

const router = Router();

// Launch Windows Wireless Projection (Miracast / Win+K panel)
router.post('/miracast', authenticateJwt, async (_req, res) => {
  try {
    const { exec } = await import('child_process');
    exec('powershell -Command "Start-Process ms-settings-connectabledevices:devicediscovery"');
    res.json({
      success: true,
      message: 'Panel de Proyección Inalámbrica de Windows (Miracast / Win+K) abierto exitosamente en la laptop',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Universal command execution endpoint
router.post('/:id/command', authenticateJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const { command, payload } = req.body;
    if (!command) {
      res.status(400).json({ error: 'Comando requerido' });
      return;
    }

    const result = await CommandExecutorService.execute(
      req.params.id as string,
      command,
      payload || {},
      req.user || { username: 'Operator' },
      req.ip
    );

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Shortcut: Power toggle/set
router.post('/:id/power', authenticateJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const { state } = req.body; // 'ON' or 'OFF'
    const command = state === 'ON' ? 'POWER_ON' : 'POWER_OFF';
    const result = await CommandExecutorService.execute(
      req.params.id as string,
      command,
      {},
      req.user || { username: 'Operator' },
      req.ip
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Shortcut: Volume set
router.post('/:id/volume', authenticateJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const { volume } = req.body;
    const result = await CommandExecutorService.execute(
      req.params.id as string,
      'SET_VOLUME',
      { volume: Number(volume) },
      req.user || { username: 'Operator' },
      req.ip
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Shortcut: Mute toggle
router.post('/:id/mute', authenticateJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await CommandExecutorService.execute(
      req.params.id as string,
      'TOGGLE_MUTE',
      {},
      req.user || { username: 'Operator' },
      req.ip
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Shortcut: Input source
router.post('/:id/input', authenticateJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const { input } = req.body;
    const result = await CommandExecutorService.execute(
      req.params.id as string,
      'SET_INPUT',
      { input },
      req.user || { username: 'Operator' },
      req.ip
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Shortcut: Brightness
router.post('/:id/brightness', authenticateJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const { brightness } = req.body;
    const result = await CommandExecutorService.execute(
      req.params.id as string,
      'SET_BRIGHTNESS',
      { brightness: Number(brightness) },
      req.user || { username: 'Operator' },
      req.ip
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
