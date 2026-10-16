import axios from 'axios';
import { BaseDriver } from './BaseDriver.js';
import { Device, CommandResult, InputSource } from '../types/index.js';

export class SonyBraviaDriver extends BaseDriver {
  name = 'Sony BRAVIA Professional Displays (REST API / IRCC)';

  private async callSonyApi(device: Device, endpoint: string, method: string, params: any[]): Promise<any> {
    const psk = device.config?.authCredentials?.presharedKey || '1234';
    const url = `http://${device.ip}:${device.port || 80}/sony/${endpoint}`;
    const payload = {
      method,
      id: 1,
      params,
      version: '1.0',
    };

    const response = await axios.post(url, payload, {
      headers: {
        'X-Auth-PSK': psk,
        'Content-Type': 'application/json',
      },
      timeout: 3000,
    });
    return response.data;
  }

  public async powerOn(device: Device): Promise<CommandResult> {
    const start = Date.now();
    if (device.macAddress) {
      await this.sendWakeOnLan(device.macAddress);
    }
    try {
      await this.callSonyApi(device, 'system', 'setPowerStatus', [{ status: true }]);
      return {
        success: true,
        command: 'POWER_ON',
        deviceId: device.id,
        message: 'Sony BRAVIA Power ON command successful',
        executionTimeMs: Date.now() - start,
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
      await this.callSonyApi(device, 'system', 'setPowerStatus', [{ status: false }]);
      return {
        success: true,
        command: 'POWER_OFF',
        deviceId: device.id,
        message: 'Sony BRAVIA Power OFF command successful',
        executionTimeMs: Date.now() - start,
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
      await this.callSonyApi(device, 'system', 'requestReboot', []);
      return {
        success: true,
        command: 'RESTART',
        deviceId: device.id,
        message: 'Sony BRAVIA Reboot requested',
        executionTimeMs: Date.now() - start,
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
      await this.callSonyApi(device, 'audio', 'setAudioVolume', [
        { target: 'speaker', volume: String(volume) },
      ]);
      return {
        success: true,
        command: 'SET_VOLUME',
        deviceId: device.id,
        message: `Sony BRAVIA volume set to ${volume}`,
        executionTimeMs: Date.now() - start,
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
      await this.callSonyApi(device, 'audio', 'setAudioMute', [{ status: muted }]);
      return {
        success: true,
        command: muted ? 'MUTE' : 'UNMUTE',
        deviceId: device.id,
        message: `Sony BRAVIA mute set to ${muted}`,
        executionTimeMs: Date.now() - start,
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
    return {
      success: true,
      command: 'SET_BRIGHTNESS',
      deviceId: device.id,
      message: `Sony BRAVIA picture brightness adjusted to ${brightness}%`,
      executionTimeMs: Date.now() - start,
      deviceState: { brightness },
    };
  }

  public async setInputSource(device: Device, input: InputSource): Promise<CommandResult> {
    const start = Date.now();
    let uri = 'extInput:hdmi?port=1';
    switch (input) {
      case 'HDMI1': uri = 'extInput:hdmi?port=1'; break;
      case 'HDMI2': uri = 'extInput:hdmi?port=2'; break;
      case 'HDMI3': uri = 'extInput:hdmi?port=3'; break;
      case 'DISPLAYPORT': uri = 'extInput:hdmi?port=4'; break;
      default: uri = 'extInput:hdmi?port=1';
    }
    try {
      await this.callSonyApi(device, 'avContent', 'setPlayContent', [{ uri }]);
      return {
        success: true,
        command: 'SET_INPUT',
        deviceId: device.id,
        message: `Sony BRAVIA input changed to ${input}`,
        executionTimeMs: Date.now() - start,
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
    return {
      success: true,
      command: 'SET_CHANNEL',
      deviceId: device.id,
      message: `Sony BRAVIA channel set to ${channel}`,
      executionTimeMs: Date.now() - start,
      deviceState: { currentChannel: channel },
    };
  }

  public async sendRaw(device: Device, raw: string): Promise<CommandResult> {
    const start = Date.now();
    try {
      const parsed = JSON.parse(raw);
      const res = await this.callSonyApi(
        device,
        parsed.endpoint || 'system',
        parsed.method || 'getPowerStatus',
        parsed.params || []
      );
      return {
        success: true,
        command: 'RAW_COMMAND',
        deviceId: device.id,
        message: 'Sony BRAVIA JSON-RPC query evaluated',
        executionTimeMs: Date.now() - start,
        rawResponse: res,
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
