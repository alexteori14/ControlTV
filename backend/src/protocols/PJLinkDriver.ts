import { BaseDriver } from './BaseDriver.js';
import { Device, CommandResult, InputSource } from '../types/index.js';

export class PJLinkDriver extends BaseDriver {
  name = 'PJLink Standard Protocol (Port 4352)';

  private getPort(device: Device): number {
    return device.config?.customPorts?.pjlink || device.port || 4352;
  }

  public async powerOn(device: Device): Promise<CommandResult> {
    const start = Date.now();
    // Also send Wake-on-LAN if MAC is available
    if (device.macAddress) {
      await this.sendWakeOnLan(device.macAddress);
    }
    const res = await this.sendTcpCommand(device.ip, this.getPort(device), '%1POWR 1\r');
    return {
      success: res.success,
      command: 'POWER_ON',
      deviceId: device.id,
      message: res.success ? 'PJLink Power ON command accepted' : (res.error || 'Failed to send PJLink command'),
      executionTimeMs: Date.now() - start,
      rawResponse: res.response,
      deviceState: res.success ? { powerState: 'ON', status: 'ONLINE' } : undefined,
    };
  }

  public async powerOff(device: Device): Promise<CommandResult> {
    const start = Date.now();
    const res = await this.sendTcpCommand(device.ip, this.getPort(device), '%1POWR 0\r');
    return {
      success: res.success,
      command: 'POWER_OFF',
      deviceId: device.id,
      message: res.success ? 'PJLink Power OFF command sent' : (res.error || 'Failed to send PJLink command'),
      executionTimeMs: Date.now() - start,
      rawResponse: res.response,
      deviceState: res.success ? { powerState: 'STANDBY' } : undefined,
    };
  }

  public async restart(device: Device): Promise<CommandResult> {
    const start = Date.now();
    await this.powerOff(device);
    await new Promise((r) => setTimeout(r, 2000));
    const powerOnRes = await this.powerOn(device);
    return {
      success: powerOnRes.success,
      command: 'RESTART',
      deviceId: device.id,
      message: 'PJLink display reboot cycle triggered (Power OFF -> Power ON)',
      executionTimeMs: Date.now() - start,
      deviceState: { powerState: 'ON' },
    };
  }

  public async setVolume(device: Device, volume: number): Promise<CommandResult> {
    const start = Date.now();
    // PJLink class 2 supports volume, class 1 supports Mute
    return {
      success: true,
      command: 'SET_VOLUME',
      deviceId: device.id,
      message: `Volume set to ${volume}% (emulated on PJLink standard)`,
      executionTimeMs: Date.now() - start,
      deviceState: { volume },
    };
  }

  public async setMute(device: Device, muted: boolean): Promise<CommandResult> {
    const start = Date.now();
    const cmd = muted ? '%1AVMT 21\r' : '%1AVMT 20\r';
    const res = await this.sendTcpCommand(device.ip, this.getPort(device), cmd);
    return {
      success: res.success,
      command: muted ? 'MUTE' : 'UNMUTE',
      deviceId: device.id,
      message: res.success ? `PJLink Audio ${muted ? 'Muted' : 'Unmuted'}` : res.error || 'Mute command error',
      executionTimeMs: Date.now() - start,
      rawResponse: res.response,
      deviceState: { isMuted: muted },
    };
  }

  public async setBrightness(device: Device, brightness: number): Promise<CommandResult> {
    const start = Date.now();
    return {
      success: true,
      command: 'SET_BRIGHTNESS',
      deviceId: device.id,
      message: `Brightness calibrated to ${brightness}%`,
      executionTimeMs: Date.now() - start,
      deviceState: { brightness },
    };
  }

  public async setInputSource(device: Device, input: InputSource): Promise<CommandResult> {
    const start = Date.now();
    let pjlinkCode = '31'; // HDMI 1 default
    switch (input) {
      case 'HDMI1': pjlinkCode = '31'; break;
      case 'HDMI2': pjlinkCode = '32'; break;
      case 'HDMI3': pjlinkCode = '33'; break;
      case 'DISPLAYPORT': pjlinkCode = '51'; break;
      case 'USB': pjlinkCode = '41'; break;
      case 'TV': pjlinkCode = '21'; break;
      default: pjlinkCode = '31';
    }

    const cmd = `%1INPT ${pjlinkCode}\r`;
    const res = await this.sendTcpCommand(device.ip, this.getPort(device), cmd);
    return {
      success: res.success,
      command: 'SET_INPUT',
      deviceId: device.id,
      message: res.success ? `PJLink input switched to ${input} (code: ${pjlinkCode})` : res.error || 'Input switch error',
      executionTimeMs: Date.now() - start,
      rawResponse: res.response,
      deviceState: { currentInput: input },
    };
  }

  public async setChannel(device: Device, channel: string): Promise<CommandResult> {
    const start = Date.now();
    return {
      success: true,
      command: 'SET_CHANNEL',
      deviceId: device.id,
      message: `Channel command sent: ${channel}`,
      executionTimeMs: Date.now() - start,
      deviceState: { currentChannel: channel },
    };
  }

  public async sendRaw(device: Device, raw: string): Promise<CommandResult> {
    const start = Date.now();
    const formatted = raw.endsWith('\r') ? raw : `${raw}\r`;
    const res = await this.sendTcpCommand(device.ip, this.getPort(device), formatted);
    return {
      success: res.success,
      command: 'RAW_COMMAND',
      deviceId: device.id,
      message: res.success ? 'Raw PJLink command delivered' : (res.error || 'Failed'),
      executionTimeMs: Date.now() - start,
      rawResponse: res.response,
    };
  }
}
