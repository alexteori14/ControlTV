import { Router } from 'express';
import { CommandExecutorService } from '../services/CommandExecutorService.js';
import { ScreenCaptureService } from '../services/ScreenCaptureService.js';
import { DeviceManagerService } from '../services/DeviceManagerService.js';
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

// GET /api/control/:id/screenshot - Returns current or latest TV screen capture
router.get('/:id/screenshot', authenticateJwt, async (req, res) => {
  try {
    const deviceId = req.params.id as string;
    const device = await DeviceManagerService.getDeviceById(deviceId);
    if (!device) {
      res.status(404).json({ error: 'Dispositivo no encontrado' });
      return;
    }

    let capture = ScreenCaptureService.getLatestCapture(deviceId);
    if (!capture) {
      capture = await ScreenCaptureService.captureForDevice(device, 'STATUS_CHECK');
    }

    res.json(capture);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/control/:id/capture - Forces a live television screen capture on-demand
router.post('/:id/capture', authenticateJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const deviceId = req.params.id as string;
    const device = await DeviceManagerService.getDeviceById(deviceId);
    if (!device) {
      res.status(404).json({ error: 'Dispositivo no encontrado' });
      return;
    }

    const capture = await ScreenCaptureService.captureForDevice(device, 'MANUAL_CAPTURE');
    res.json(capture);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/control/:id/captures - Returns action capture history for television
router.get('/:id/captures', authenticateJwt, async (req, res) => {
  try {
    const deviceId = req.params.id as string;
    const history = ScreenCaptureService.getDeviceCaptures(deviceId);
    res.json({ captures: history });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
