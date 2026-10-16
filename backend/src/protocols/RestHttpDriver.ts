import axios from 'axios';
import { BaseDriver } from './BaseDriver.js';
import { Device, CommandResult, InputSource } from '../types/index.js';

export class RestHttpDriver extends BaseDriver {
  name = 'Generic REST API / HTTP Driver';

  private getBaseUrl(device: Device): string {
    const protocol = device.connectionType === 'HTTPS' ? 'https' : 'http';
    return `${protocol}://${device.ip}:${device.port || 80}`;
  }

  private async postCommand(device: Device, endpoint: string, data: any): Promise<any> {
    const url = `${this.getBaseUrl(device)}${endpoint}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    
    if (device.config?.authCredentials?.token) {
      headers['Authorization'] = `Bearer ${device.config.authCredentials.token}`;
    }

    const res = await axios.post(url, data, { headers, timeout: 3000 });
    return res.data;
  }

  public async powerOn(device: Device): Promise<CommandResult> {
    const start = Date.now();
    if (device.macAddress) {
      await this.sendWakeOnLan(device.macAddress);
    }
    try {
      const res = await this.postCommand(device, '/api/power', { state: 'ON' });
      return {
        success: true,
        command: 'POWER_ON',
        deviceId: device.id,
        message: 'HTTP REST Power ON successful',
        executionTimeMs: Date.now() - start,
        rawResponse: res,
        deviceState: { powerState: 'ON', status: 'ONLINE' },
      };
    } catch (err: any) {
      return {
        success: false,
        command: 'POWER_ON',
        deviceId: device.id,
        message: err.message,
        executionTimeMs: Date.now() - start,
      };
    }
  }

  public async powerOff(device: Device): Promise<CommandResult> {
    const start = Date.now();
    try {
      const res = await this.postCommand(device, '/api/power', { state: 'OFF' });
      return {
        success: true,
        command: 'POWER_OFF',
        deviceId: device.id,
        message: 'HTTP REST Power OFF successful',
        executionTimeMs: Date.now() - start,
        rawResponse: res,
        deviceState: { powerState: 'STANDBY' },
      };
    } catch (err: any) {
      return {
        success: false,
        command: 'POWER_OFF',
        deviceId: device.id,
        message: err.message,
        executionTimeMs: Date.now() - start,
      };
    }
  }

  public async restart(device: Device): Promise<CommandResult> {
    const start = Date.now();
    try {
      const res = await this.postCommand(device, '/api/reboot', {});
      return {
        success: true,
        command: 'RESTART',
        deviceId: device.id,
        message: 'HTTP REST Reboot requested',
        executionTimeMs: Date.now() - start,
        rawResponse: res,
        deviceState: { powerState: 'ON' },
      };
    } catch (err: any) {
      return {
        success: false,
        command: 'RESTART',
        deviceId: device.id,
        message: err.message,
        executionTimeMs: Date.now() - start,
      };
    }
  }

  public async setVolume(device: Device, volume: number): Promise<CommandResult> {
    const start = Date.now();
    try {
      const res = await this.postCommand(device, '/api/volume', { volume });
      return {
        success: true,
        command: 'SET_VOLUME',
        deviceId: device.id,
        message: `HTTP REST Volume set to ${volume}`,
        executionTimeMs: Date.now() - start,
        rawResponse: res,
        deviceState: { volume },
      };
    } catch (err: any) {
      return {
        success: false,
        command: 'SET_VOLUME',
        deviceId: device.id,
        message: err.message,
        executionTimeMs: Date.now() - start,
      };
    }
  }

  public async setMute(device: Device, muted: boolean): Promise<CommandResult> {
    const start = Date.now();
    try {
      const res = await this.postCommand(device, '/api/mute', { muted });
      return {
        success: true,
        command: muted ? 'MUTE' : 'UNMUTE',
        deviceId: device.id,
        message: `HTTP REST Mute set to ${muted}`,
        executionTimeMs: Date.now() - start,
        rawResponse: res,
        deviceState: { isMuted: muted },
      };
    } catch (err: any) {
      return {
        success: false,
        command: muted ? 'MUTE' : 'UNMUTE',
        deviceId: device.id,
        message: err.message,
        executionTimeMs: Date.now() - start,
      };
    }
  }

  public async setBrightness(device: Device, brightness: number): Promise<CommandResult> {
    const start = Date.now();
    try {
      const res = await this.postCommand(device, '/api/brightness', { brightness });
      return {
        success: true,
        command: 'SET_BRIGHTNESS',
        deviceId: device.id,
        message: `HTTP REST Brightness set to ${brightness}%`,
        executionTimeMs: Date.now() - start,
        rawResponse: res,
        deviceState: { brightness },
      };
    } catch (err: any) {
      return {
        success: false,
        command: 'SET_BRIGHTNESS',
        deviceId: device.id,
        message: err.message,
        executionTimeMs: Date.now() - start,
      };
    }
  }

  public async setInputSource(device: Device, input: InputSource): Promise<CommandResult> {
    const start = Date.now();
    try {
      const res = await this.postCommand(device, '/api/input', { input });
      return {
        success: true,
        command: 'SET_INPUT',
        deviceId: device.id,
        message: `HTTP REST Input switched to ${input}`,
        executionTimeMs: Date.now() - start,
        rawResponse: res,
        deviceState: { currentInput: input },
      };
    } catch (err: any) {
      return {
        success: false,
        command: 'SET_INPUT',
        deviceId: device.id,
        message: err.message,
        executionTimeMs: Date.now() - start,
      };
    }
  }

  public async setChannel(device: Device, channel: string): Promise<CommandResult> {
    const start = Date.now();
    try {
      const res = await this.postCommand(device, '/api/channel', { channel });
      return {
        success: true,
        command: 'SET_CHANNEL',
        deviceId: device.id,
        message: `HTTP REST Channel set to ${channel}`,
        executionTimeMs: Date.now() - start,
        rawResponse: res,
        deviceState: { currentChannel: channel },
      };
    } catch (err: any) {
      return {
        success: false,
        command: 'SET_CHANNEL',
        deviceId: device.id,
        message: err.message,
        executionTimeMs: Date.now() - start,
      };
    }
  }

  public async sendRaw(device: Device, raw: string): Promise<CommandResult> {
    const start = Date.now();
    try {
      const parsed = JSON.parse(raw);
      const res = await axios({
        method: parsed.method || 'GET',
        url: `${this.getBaseUrl(device)}${parsed.endpoint || '/'}`,
        data: parsed.data,
        timeout: 3000,
      });
      return {
        success: true,
        command: 'RAW_COMMAND',
        deviceId: device.id,
        message: 'Raw HTTP request completed',
        executionTimeMs: Date.now() - start,
        rawResponse: res.data,
      };
    } catch (err: any) {
      return {
        success: false,
        command: 'RAW_COMMAND',
        deviceId: device.id,
        message: err.message,
        executionTimeMs: Date.now() - start,
      };
    }
  }
}
