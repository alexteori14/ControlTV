import { BaseDriver } from './BaseDriver.js';
import { Device, CommandResult, InputSource } from '../types/index.js';

export class LgSuperSignDriver extends BaseDriver {
  name = 'LG Commercial Displays (SuperSign & webOS IP Driver)';

  private getPort(device: Device): number {
    return device.config?.customPorts?.telnet || device.port || 9761;
  }

  public async powerOn(device: Device): Promise<CommandResult> {
    const start = Date.now();
    if (device.macAddress) {
      await this.sendWakeOnLan(device.macAddress);
    }
    // LG RS232-C over IP: 'ka 01 01\r' (Power On)
    const res = await this.sendTcpCommand(device.ip, this.getPort(device), 'ka 01 01\r');
    return {
      success: res.success,
      command: 'POWER_ON',
      deviceId: device.id,
      message: res.success ? 'LG SuperSign Power ON sent' : (res.error || 'Failed'),
      executionTimeMs: Date.now() - start,
      rawResponse: res.response,
      deviceState: { powerState: 'ON', status: 'ONLINE' },
    };
  }

  public async powerOff(device: Device): Promise<CommandResult> {
    const start = Date.now();
    // LG RS232-C over IP: 'ka 01 00\r' (Power Off)
    const res = await this.sendTcpCommand(device.ip, this.getPort(device), 'ka 01 00\r');
    return {
      success: res.success,
      command: 'POWER_OFF',
      deviceId: device.id,
      message: res.success ? 'LG SuperSign Power OFF sent' : (res.error || 'Failed'),
      executionTimeMs: Date.now() - start,
      rawResponse: res.response,
      deviceState: { powerState: 'STANDBY' },
    };
  }

  public async restart(device: Device): Promise<CommandResult> {
    const start = Date.now();
    await this.powerOff(device);
    await new Promise((r) => setTimeout(r, 1500));
    await this.powerOn(device);
    return {
      success: true,
      command: 'RESTART',
      deviceId: device.id,
      message: 'LG Commercial screen reboot sequence initiated',
      executionTimeMs: Date.now() - start,
      deviceState: { powerState: 'ON' },
    };
  }

  public async setVolume(device: Device, volume: number): Promise<CommandResult> {
    const start = Date.now();
    const hexVal = Math.max(0, Math.min(100, volume)).toString(16).padStart(2, '0');
    const res = await this.sendTcpCommand(device.ip, this.getPort(device), `kf 01 ${hexVal}\r`);
    return {
      success: res.success,
      command: 'SET_VOLUME',
      deviceId: device.id,
      message: res.success ? `LG Volume updated to ${volume}` : (res.error || 'Failed'),
      executionTimeMs: Date.now() - start,
      deviceState: { volume },
    };
  }

  public async setMute(device: Device, muted: boolean): Promise<CommandResult> {
    const start = Date.now();
    // In LG: ke 01 00 is mute on, ke 01 01 is mute off
    const cmd = muted ? 'ke 01 00\r' : 'ke 01 01\r';
    const res = await this.sendTcpCommand(device.ip, this.getPort(device), cmd);
    return {
      success: res.success,
      command: muted ? 'MUTE' : 'UNMUTE',
      deviceId: device.id,
      message: res.success ? `LG Mute status set to ${muted}` : (res.error || 'Failed'),
      executionTimeMs: Date.now() - start,
      deviceState: { isMuted: muted },
    };
  }

  public async setBrightness(device: Device, brightness: number): Promise<CommandResult> {
    const start = Date.now();
    const hexVal = Math.max(0, Math.min(100, brightness)).toString(16).padStart(2, '0');
    const res = await this.sendTcpCommand(device.ip, this.getPort(device), `kh 01 ${hexVal}\r`);
    return {
      success: res.success,
      command: 'SET_BRIGHTNESS',
      deviceId: device.id,
      message: res.success ? `LG Brightness set to ${brightness}%` : (res.error || 'Failed'),
      executionTimeMs: Date.now() - start,
      deviceState: { brightness },
    };
  }

  public async setInputSource(device: Device, input: InputSource): Promise<CommandResult> {
    const start = Date.now();
    let hexCode = '90'; // HDMI 1
    switch (input) {
      case 'HDMI1': hexCode = '90'; break;
      case 'HDMI2': hexCode = '91'; break;
      case 'HDMI3': hexCode = '92'; break;
      case 'DISPLAYPORT': hexCode = 'd0'; break;
      case 'USB': hexCode = '20'; break;
      case 'TV': hexCode = '10'; break;
      default: hexCode = '90';
    }
    const res = await this.sendTcpCommand(device.ip, this.getPort(device), `xb 01 ${hexCode}\r`);
    return {
      success: res.success,
      command: 'SET_INPUT',
      deviceId: device.id,
      message: res.success ? `LG Input switched to ${input} (code 0x${hexCode})` : (res.error || 'Failed'),
      executionTimeMs: Date.now() - start,
      deviceState: { currentInput: input },
    };
  }

  public async setChannel(device: Device, channel: string): Promise<CommandResult> {
    const start = Date.now();
    const res = await this.sendTcpCommand(device.ip, this.getPort(device), `ma 01 ${channel}\r`);
    return {
      success: res.success,
      command: 'SET_CHANNEL',
      deviceId: device.id,
      message: res.success ? `LG Channel set to ${channel}` : (res.error || 'Failed'),
      executionTimeMs: Date.now() - start,
      deviceState: { currentChannel: channel },
    };
  }

  public async sendRaw(device: Device, raw: string): Promise<CommandResult> {
    const start = Date.now();
    const cmd = raw.endsWith('\r') ? raw : `${raw}\r`;
    const res = await this.sendTcpCommand(device.ip, this.getPort(device), cmd);
    return {
      success: res.success,
      command: 'RAW_COMMAND',
      deviceId: device.id,
      message: res.success ? 'Raw LG command dispatched' : (res.error || 'Failed'),
      executionTimeMs: Date.now() - start,
      rawResponse: res.response,
    };
  }
}
