import { Router } from 'express';
import { DeviceManagerService } from '../services/DeviceManagerService.js';
import { DriverFactory } from '../protocols/DriverFactory.js';
import { authenticateJwt, requireRole, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { AuditService } from '../services/AuditService.js';
import { CONFIG } from '../config/index.js';

const router = Router();

// List all devices
router.get('/', authenticateJwt, async (req, res) => {
  try {
    const devices = await DeviceManagerService.getAllDevices();
    res.json({ devices });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get single device
router.get('/:id', authenticateJwt, async (req, res) => {
  try {
    const device = await DeviceManagerService.getDeviceById(req.params.id as string);
    if (!device) {
      res.status(404).json({ error: 'Dispositivo no encontrado' });
      return;
    }
    res.json({ device });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Register new device
router.post('/', authenticateJwt, requireRole(['ADMIN', 'SUPERVISOR']), async (req: AuthenticatedRequest, res) => {
  try {
    const { name, ip, port, brand, model, connectionType, location, macAddress, streamType, streamUrl, config } = req.body;

    if (!name || !ip || !port || !brand || !model || !connectionType) {
      res.status(400).json({ error: 'Campos obligatorios: name, ip, port, brand, model, connectionType' });
      return;
    }

    const created = await DeviceManagerService.createDevice({
      name,
      ip,
      port: Number(port),
      brand,
      model,
      connectionType,
      location,
      macAddress,
      streamType,
      streamUrl,
      config,
    });

    await AuditService.logAction({
      userId: req.user?.id,
      username: req.user?.username || 'System',
      deviceId: created.id,
      deviceName: created.name,
      action: 'DEVICE_CREATE',
      details: `Pantalla ${created.name} (${created.ip}:${created.port}) registrada en el sistema`,
      status: 'SUCCESS',
      ipAddress: req.ip,
    });

    res.status(201).json({ device: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update device
router.put('/:id', authenticateJwt, requireRole(['ADMIN', 'SUPERVISOR']), async (req: AuthenticatedRequest, res) => {
  try {
    const updated = await DeviceManagerService.updateDevice(req.params.id as string, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Dispositivo no encontrado' });
      return;
    }

    await AuditService.logAction({
      userId: req.user?.id,
      username: req.user?.username || 'System',
      deviceId: updated.id,
      deviceName: updated.name,
      action: 'DEVICE_UPDATE',
      details: `Configuración de pantalla ${updated.name} actualizada`,
      status: 'SUCCESS',
      ipAddress: req.ip,
    });

    res.json({ device: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete device
router.delete('/:id', authenticateJwt, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const device = await DeviceManagerService.getDeviceById(req.params.id as string);
    const success = await DeviceManagerService.deleteDevice(req.params.id as string);
    if (!success) {
      res.status(404).json({ error: 'Dispositivo no encontrado' });
      return;
    }

    await AuditService.logAction({
      userId: req.user?.id,
      username: req.user?.username || 'System',
      deviceId: req.params.id as string,
      deviceName: device?.name,
      action: 'DEVICE_DELETE',
      details: `Pantalla ${device?.name || req.params.id as string} eliminada`,
      status: 'SUCCESS',
      ipAddress: req.ip,
    });

    res.json({ message: 'Dispositivo eliminado correctamente' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Test connectivity on demand (Requirement 3: "Validar conectividad")
router.post('/:id/ping', authenticateJwt, async (req, res) => {
  try {
    const device = await DeviceManagerService.getDeviceById(req.params.id as string);
    if (!device) {
      res.status(404).json({ error: 'Dispositivo no encontrado' });
      return;
    }

    const driver = DriverFactory.getDriver(device);
    const connectivity = await driver.checkConnectivity(device, CONFIG.PING_TIMEOUT_MS);
    
    // Update live status
    await DeviceManagerService.updateDeviceState(device.id, {
      status: connectivity.reachable ? 'ONLINE' : 'OFFLINE',
    });

    res.json({
      reachable: connectivity.reachable,
      latencyMs: connectivity.latencyMs,
      error: connectivity.error,
      details: connectivity.details,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
