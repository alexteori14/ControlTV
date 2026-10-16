import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/index.js';
import { Device, DeviceStatus, PowerState, InputSource, ScreenStreamType } from '../types/index.js';
import { DriverFactory } from '../protocols/DriverFactory.js';
import { CONFIG } from '../config/index.js';
import { SocketManager } from '../websocket/SocketManager.js';

export class DeviceManagerService {
  private static heartbeatTimer: NodeJS.Timeout | null = null;

  public static async getAllDevices(): Promise<Device[]> {
    const rows = await db.query('SELECT * FROM devices ORDER BY name ASC');
    return rows.map(this.mapRowToDevice);
  }

  public static async getDeviceById(id: string): Promise<Device | null> {
    const row = await db.queryOne('SELECT * FROM devices WHERE id = $1', [id]);
    return row ? this.mapRowToDevice(row) : null;
  }
  public static async createDevice(data: Partial<Device>): Promise<Device> {
    const id = uuidv4();
    const brand = data.brand || 'Generic';
    let port = Number(data.port || 80);
    let connectionType = data.connectionType || 'HTTP';

    // Auto-normalize for Samsung Smart TVs
    if (brand.toLowerCase().includes('samsung')) {
      if (port === 9 || port === 80 || port === 0 || isNaN(port)) {
        port = 8001;
      }
      if (connectionType === 'HTTP' || !connectionType) {
        connectionType = 'WEBSOCKET';
      }
    }

    const configObj = { ...(data.config || {}) };
    const configJson = JSON.stringify(configObj);
    
    await db.query(
      `INSERT INTO devices (
        id, name, ip, port, mac_address, brand, model, connection_type,
        location, status, power_state, volume, is_muted, brightness,
        current_input, current_channel, temperature, uptime_seconds,
        stream_type, stream_url, config_json, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20,
        $21, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )`,
      [
        id,
        data.name || 'Nueva Pantalla',
        data.ip || '192.168.1.100',
        port,
        data.macAddress || null,
        brand,
        data.model || 'Smart Display',
        connectionType,
        data.location || 'Oficina General',
        data.status || 'OFFLINE',
        data.powerState || 'STANDBY',
        data.volume ?? 20,
        data.isMuted ?? false,
        data.brightness ?? 80,
        data.currentInput || 'HDMI1',
        data.currentChannel || null,
        data.temperature || 32.0,
        0,
        data.streamType || 'NONE',
        data.streamUrl || null,
        configJson,
      ]
    );

    const created = await this.getDeviceById(id);
    if (created) {
      SocketManager.broadcast('device_created', created);
    }
    return created!;
  }

  public static async updateDevice(id: string, data: Partial<Device>): Promise<Device | null> {
    const existing = await this.getDeviceById(id);
    if (!existing) return null;

    const updated: Device = {
      ...existing,
      ...data,
      config: data.config ? { ...existing.config, ...data.config } : existing.config,
    };

    if (updated.brand?.toLowerCase().includes('samsung')) {
      if (updated.port === 9 || updated.port === 80 || updated.port === 0 || isNaN(updated.port)) {
        updated.port = 8001;
      }
      if (updated.connectionType === 'HTTP' || !updated.connectionType) {
        updated.connectionType = 'WEBSOCKET';
      }
    }

    await db.query(
      `UPDATE devices SET
        name = $1, ip = $2, port = $3, mac_address = $4, brand = $5,
        model = $6, connection_type = $7, location = $8, status = $9,
        power_state = $10, volume = $11, is_muted = $12, brightness = $13,
        current_input = $14, current_channel = $15, temperature = $16,
        stream_type = $17, stream_url = $18, config_json = $19,
        last_communication = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $20`,
      [
        updated.name,
        updated.ip,
        updated.port,
        updated.macAddress,
        updated.brand,
        updated.model,
        updated.connectionType,
        updated.location,
        updated.status,
        updated.powerState,
        updated.volume,
        updated.isMuted,
        updated.brightness,
        updated.currentInput,
        updated.currentChannel,
        updated.temperature,
        updated.streamType,
        updated.streamUrl,
        JSON.stringify(updated.config),
        id,
      ]
    );

    const saved = await this.getDeviceById(id);
    if (saved) {
      SocketManager.broadcast('device_updated', saved);
    }
    return saved;
  }

  public static async deleteDevice(id: string): Promise<boolean> {
    const existing = await this.getDeviceById(id);
    if (!existing) return false;

    await db.query('DELETE FROM devices WHERE id = $1', [id]);
    SocketManager.broadcast('device_deleted', { id });
    return true;
  }

  public static async updateDeviceState(id: string, patch: Partial<Device>): Promise<void> {
    const current = await this.getDeviceById(id);
    if (!current) return;

    const fields: string[] = [];
    const values: any[] = [];

    if (patch.status !== undefined) {
      fields.push(`status = $${fields.length + 1}`);
      values.push(patch.status);
    }
    if (patch.powerState !== undefined) {
      fields.push(`power_state = $${fields.length + 1}`);
      values.push(patch.powerState);
    }
    if (patch.volume !== undefined) {
      fields.push(`volume = $${fields.length + 1}`);
      values.push(patch.volume);
    }
    if (patch.isMuted !== undefined) {
      fields.push(`is_muted = $${fields.length + 1}`);
      values.push(patch.isMuted);
    }
    if (patch.brightness !== undefined) {
      fields.push(`brightness = $${fields.length + 1}`);
      values.push(patch.brightness);
    }
    if (patch.currentInput !== undefined) {
      fields.push(`current_input = $${fields.length + 1}`);
      values.push(patch.currentInput);
    }
    if (patch.temperature !== undefined) {
      fields.push(`temperature = $${fields.length + 1}`);
      values.push(patch.temperature);
    }

    fields.push(`last_communication = CURRENT_TIMESTAMP`);
    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    values.push(id);
    const sql = `UPDATE devices SET ${fields.join(', ')} WHERE id = $${values.length}`;
    await db.query(sql, values);

    const updated = await this.getDeviceById(id);
    if (updated) {
      SocketManager.broadcast('device_updated', updated);
    }
  }

  // Periodic Heartbeat & Telemetry Monitor
  public static startHeartbeatMonitor(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

    console.log(`[Heartbeat] Starting background monitor (interval: ${CONFIG.HEARTBEAT_INTERVAL_MS}ms)`);
    this.heartbeatTimer = setInterval(async () => {
      try {
        const devices = await this.getAllDevices();
        for (const device of devices) {
          const driver = DriverFactory.getDriver(device);
          const connectivity = await driver.checkConnectivity(device, CONFIG.PING_TIMEOUT_MS);
          const newStatus: DeviceStatus = connectivity.reachable ? 'ONLINE' : 'OFFLINE';

          let telemetry = null;
          if (connectivity.reachable) {
            telemetry = await driver.getTelemetry(device);
          }

          // Record telemetry
          if (connectivity.reachable && telemetry?.temperature) {
            await db.query(
              `INSERT INTO telemetry (id, device_id, temperature, power_state, latency_ms, timestamp)
               VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
              [uuidv4(), device.id, telemetry.temperature, device.powerState, connectivity.latencyMs]
            );
          }

          if (device.status !== newStatus || (telemetry && telemetry.temperature !== device.temperature)) {
            await this.updateDeviceState(device.id, {
              status: newStatus,
              temperature: telemetry?.temperature ?? device.temperature,
            });
          }
        }
      } catch (err: any) {
        console.error('[Heartbeat Error]:', err.message);
      }
    }, CONFIG.HEARTBEAT_INTERVAL_MS);
  }

  private static mapRowToDevice(r: any): Device {
    let config: any = {};
    try {
      config = r.config_json ? JSON.parse(r.config_json) : {};
    } catch {
      config = {};
    }

    return {
      id: r.id,
      name: r.name,
      ip: r.ip,
      port: Number(r.port),
      macAddress: r.mac_address,
      brand: r.brand,
      model: r.model,
      connectionType: r.connection_type,
      location: r.location,
      status: r.status as DeviceStatus,
      powerState: r.power_state as PowerState,
      volume: Number(r.volume || 0),
      isMuted: Boolean(r.is_muted),
      brightness: Number(r.brightness || 80),
      currentInput: r.current_input as InputSource,
      currentChannel: r.current_channel,
      temperature: r.temperature !== null ? Number(r.temperature) : undefined,
      uptimeSeconds: Number(r.uptime_seconds || 0),
      lastCommunication: r.last_communication,
      streamType: r.stream_type as ScreenStreamType,
      streamUrl: r.stream_url,
      config,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }
}
