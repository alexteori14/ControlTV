import { Router } from 'express';
import { NetworkScannerService } from '../services/NetworkScannerService.js';
import { DeviceManagerService } from '../services/DeviceManagerService.js';
import { authenticateJwt, requireRole, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { AuditService } from '../services/AuditService.js';

const router = Router();

// Get local available subnets
router.get('/subnets', authenticateJwt, (_req, res) => {
  const subnets = NetworkScannerService.getLocalSubnets();
  res.json({ subnets });
});

// Get current scan status and results
router.get('/status', authenticateJwt, (_req, res) => {
  const status = NetworkScannerService.getScanStatus();
  res.json(status);
});

// Trigger network scan
router.post('/scan', authenticateJwt, requireRole(['ADMIN', 'SUPERVISOR']), async (req: AuthenticatedRequest, res) => {
  try {
    const { subnet } = req.body;
    
    // Start scan asynchronously
    NetworkScannerService.scanNetwork(subnet || '192.168.1.0/24').catch((e) => {
      console.error('[Discovery Scan Error]:', e);
    });

    await AuditService.logAction({
      userId: req.user?.id,
      username: req.user?.username || 'System',
      action: 'NETWORK_SCAN_START',
      details: `Escaneo de red iniciado para subred ${subnet || '192.168.1.0/24'}`,
      status: 'SUCCESS',
      ipAddress: req.ip,
    });

    res.json({ message: 'Escaneo de red iniciado', isScanning: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 1-Click Import discovered device
router.post('/import', authenticateJwt, requireRole(['ADMIN', 'SUPERVISOR']), async (req: AuthenticatedRequest, res) => {
  try {
    const { discoveredDevice, customName, location } = req.body;

    if (!discoveredDevice || !discoveredDevice.ip) {
      res.status(400).json({ error: 'Datos del dispositivo descubierto requeridos' });
      return;
    }

    const defaultPort = discoveredDevice.openPorts?.[0] || 80;

    const newDevice = await DeviceManagerService.createDevice({
      name: customName || discoveredDevice.hostname || `Pantalla ${discoveredDevice.manufacturer}`,
      ip: discoveredDevice.ip,
      port: defaultPort,
      macAddress: discoveredDevice.macAddress,
      brand: discoveredDevice.manufacturer?.split(' ')?.[0] || 'Generic',
      model: discoveredDevice.suggestedModel || 'Auto Discovered Display',
      connectionType: discoveredDevice.suggestedConnectionType || 'HTTP',
      location: location || 'Área por Asignar',
      status: 'ONLINE',
      powerState: 'ON',
      streamType: 'SIMULATED',
      config: {
        customPorts: {
          telnet: discoveredDevice.openPorts?.find((p: number) => p === 1515 || p === 23),
          pjlink: discoveredDevice.openPorts?.find((p: number) => p === 4352),
        },
      },
    });

    await AuditService.logAction({
      userId: req.user?.id,
      username: req.user?.username || 'System',
      deviceId: newDevice.id,
      deviceName: newDevice.name,
      action: 'DEVICE_IMPORT',
      details: `Dispositivo descubierto en ${newDevice.ip} importado exitosamente`,
      status: 'SUCCESS',
      ipAddress: req.ip,
    });

    res.status(201).json({ device: newDevice });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
