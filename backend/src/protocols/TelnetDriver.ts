import { BaseDriver } from './BaseDriver.js';
import { Device, CommandResult, InputSource } from '../types/index.js';

export class TelnetDriver extends BaseDriver {
  name = 'Generic Telnet / TCP Socket Driver (Port 23 / Custom)';

  public async powerOn(device: Device): Promise<CommandResult> {
    const start = Date.now();
    if (device.macAddress) {
      await this.sendWakeOnLan(device.macAddress);
    }
    const res = await this.sendTcpCommand(device.ip, device.port || 23, 'POWER ON\r\n');
    return {
      success: res.success,
      command: 'POWER_ON',
      deviceId: device.id,
      message: res.success ? 'Telnet POWER ON sent' : (res.error || 'Failed'),
      executionTimeMs: Date.now() - start,
      rawResponse: res.response,
      deviceState: { powerState: 'ON', status: 'ONLINE' },
    };
  }

  public async powerOff(device: Device): Promise<CommandResult> {
    const start = Date.now();
    const res = await this.sendTcpCommand(device.ip, device.port || 23, 'POWER OFF\r\n');
    return {
      success: res.success,
      command: 'POWER_OFF',
      deviceId: device.id,
      message: res.success ? 'Telnet POWER OFF sent' : (res.error || 'Failed'),
      executionTimeMs: Date.now() - start,
      rawResponse: res.response,
      deviceState: { powerState: 'STANDBY' },
    };
  }

  public async restart(device: Device): Promise<CommandResult> {
    const start = Date.now();
    const res = await this.sendTcpCommand(device.ip, device.port || 23, 'REBOOT\r\n');
    return {
      success: res.success,
      command: 'RESTART',
      deviceId: device.id,
      message: res.success ? 'Telnet REBOOT command delivered' : (res.error || 'Failed'),
      executionTimeMs: Date.now() - start,
      deviceState: { powerState: 'ON' },
    };
  }

  public async setVolume(device: Device, volume: number): Promise<CommandResult> {
    const start = Date.now();
    const res = await this.sendTcpCommand(device.ip, device.port || 23, `VOLUME ${volume}\r\n`);
    return {
      success: res.success,
      command: 'SET_VOLUME',
      deviceId: device.id,
      message: res.success ? `Telnet volume set to ${volume}` : (res.error || 'Failed'),
      executionTimeMs: Date.now() - start,
      deviceState: { volume },
    };
  }

  public async setMute(device: Device, muted: boolean): Promise<CommandResult> {
    const start = Date.now();
    const res = await this.sendTcpCommand(device.ip, device.port || 23, `MUTE ${muted ? 'ON' : 'OFF'}\r\n`);
    return {
      success: res.success,
      command: muted ? 'MUTE' : 'UNMUTE',
      deviceId: device.id,
      message: res.success ? `Telnet mute ${muted}` : (res.error || 'Failed'),
      executionTimeMs: Date.now() - start,
      deviceState: { isMuted: muted },
    };
  }

  public async setBrightness(device: Device, brightness: number): Promise<CommandResult> {
    const start = Date.now();
    const res = await this.sendTcpCommand(device.ip, device.port || 23, `BRIGHTNESS ${brightness}\r\n`);
    return {
      success: res.success,
      command: 'SET_BRIGHTNESS',
      deviceId: device.id,
      message: res.success ? `Telnet brightness ${brightness}` : (res.error || 'Failed'),
      executionTimeMs: Date.now() - start,
      deviceState: { brightness },
    };
  }

  public async setInputSource(device: Device, input: InputSource): Promise<CommandResult> {
    const start = Date.now();
    const res = await this.sendTcpCommand(device.ip, device.port || 23, `INPUT ${input}\r\n`);
    return {
      success: res.success,
      command: 'SET_INPUT',
      deviceId: device.id,
      message: res.success ? `Telnet input switched to ${input}` : (res.error || 'Failed'),
      executionTimeMs: Date.now() - start,
      deviceState: { currentInput: input },
    };
  }

  public async setChannel(device: Device, channel: string): Promise<CommandResult> {
    const start = Date.now();
    const res = await this.sendTcpCommand(device.ip, device.port || 23, `CHANNEL ${channel}\r\n`);
    return {
      success: res.success,
      command: 'SET_CHANNEL',
      deviceId: device.id,
      message: res.success ? `Telnet channel set to ${channel}` : (res.error || 'Failed'),
      executionTimeMs: Date.now() - start,
      deviceState: { currentChannel: channel },
    };
  }

  public async sendRaw(device: Device, raw: string): Promise<CommandResult> {
    const start = Date.now();
    const res = await this.sendTcpCommand(device.ip, device.port || 23, raw.endsWith('\n') ? raw : `${raw}\r\n`);
    return {
      success: res.success,
      command: 'RAW_COMMAND',
      deviceId: device.id,
      message: res.success ? 'Raw Telnet command delivered' : (res.error || 'Failed'),
      executionTimeMs: Date.now() - start,
      rawResponse: res.response,
    };
  }
}
