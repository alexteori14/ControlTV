import { BaseDriver } from './BaseDriver.js';
import { Device, CommandResult, InputSource } from '../types/index.js';
import { ConnectivityResult, DriverTelemetry } from './DeviceDriver.js';

export class VirtualDriver extends BaseDriver {
  name = 'Virtual Display Emulator Driver';

  private states: Map<string, {
    power: 'ON' | 'OFF' | 'STANDBY';
    volume: number;
    muted: boolean;
    brightness: number;
    input: InputSource;
    channel: string;
    temperature: number;
  }> = new Map();

  private getState(device: Device) {
    if (!this.states.has(device.id)) {
      this.states.set(device.id, {
        power: device.powerState || 'ON',
        volume: device.volume ?? 25,
        muted: device.isMuted ?? false,
        brightness: device.brightness ?? 80,
        input: device.currentInput || 'HDMI1',
        channel: device.currentChannel || 'CH-01',
        temperature: device.temperature ?? 34.0,
      });
    }
    return this.states.get(device.id)!;
  }

  public override async checkConnectivity(_device: Device): Promise<ConnectivityResult> {
    return {
      reachable: true,
      latencyMs: Math.floor(Math.random() * 5) + 2,
    };
  }

  public async powerOn(device: Device): Promise<CommandResult> {
    const start = Date.now();
    const state = this.getState(device);
    state.power = 'ON';
    // When powered on, temperature gradually rises towards 36C
    state.temperature = Number((34.0 + Math.random() * 2.5).toFixed(1));
    return {
      success: true,
      command: 'POWER_ON',
      deviceId: device.id,
      message: 'Virtual Display powered ON',
      executionTimeMs: Date.now() - start,
      deviceState: { powerState: 'ON', status: 'ONLINE', temperature: state.temperature },
    };
  }

  public async powerOff(device: Device): Promise<CommandResult> {
    const start = Date.now();
    const state = this.getState(device);
    state.power = 'STANDBY';
    // In standby, temperature cools down towards 28C
    state.temperature = Number((28.0 + Math.random() * 1.5).toFixed(1));
    return {
      success: true,
      command: 'POWER_OFF',
      deviceId: device.id,
      message: 'Virtual Display set to STANDBY',
      executionTimeMs: Date.now() - start,
      deviceState: { powerState: 'STANDBY', temperature: state.temperature },
    };
  }

  public async restart(device: Device): Promise<CommandResult> {
    const start = Date.now();
    const state = this.getState(device);
    state.power = 'STANDBY';
    await new Promise((r) => setTimeout(r, 600));
    state.power = 'ON';
    return {
      success: true,
      command: 'RESTART',
      deviceId: device.id,
      message: 'Virtual Display rebooted successfully',
      executionTimeMs: Date.now() - start,
      deviceState: { powerState: 'ON', status: 'ONLINE' },
    };
  }

  public async setVolume(device: Device, volume: number): Promise<CommandResult> {
    const start = Date.now();
    const state = this.getState(device);
    state.volume = Math.max(0, Math.min(100, volume));
    return {
      success: true,
      command: 'SET_VOLUME',
      deviceId: device.id,
      message: `Virtual Display volume adjusted to ${state.volume}%`,
      executionTimeMs: Date.now() - start,
      deviceState: { volume: state.volume },
    };
  }

  public async setMute(device: Device, muted: boolean): Promise<CommandResult> {
    const start = Date.now();
    const state = this.getState(device);
    state.muted = muted;
    return {
      success: true,
      command: muted ? 'MUTE' : 'UNMUTE',
      deviceId: device.id,
      message: `Virtual Display audio ${muted ? 'MUTED' : 'UNMUTED'}`,
      executionTimeMs: Date.now() - start,
      deviceState: { isMuted: muted },
    };
  }

  public async setBrightness(device: Device, brightness: number): Promise<CommandResult> {
    const start = Date.now();
    const state = this.getState(device);
    state.brightness = Math.max(0, Math.min(100, brightness));
    return {
      success: true,
      command: 'SET_BRIGHTNESS',
      deviceId: device.id,
      message: `Virtual Display brightness set to ${state.brightness}%`,
      executionTimeMs: Date.now() - start,
      deviceState: { brightness: state.brightness },
    };
  }

  public async setInputSource(device: Device, input: InputSource): Promise<CommandResult> {
    const start = Date.now();
    const state = this.getState(device);
    state.input = input;
    return {
      success: true,
      command: 'SET_INPUT',
      deviceId: device.id,
      message: `Virtual Display input switched to ${input}`,
      executionTimeMs: Date.now() - start,
      deviceState: { currentInput: input },
    };
  }

  public async setChannel(device: Device, channel: string): Promise<CommandResult> {
    const start = Date.now();
    const state = this.getState(device);
    state.channel = channel;
    return {
      success: true,
      command: 'SET_CHANNEL',
      deviceId: device.id,
      message: `Virtual Display tuned to channel ${channel}`,
      executionTimeMs: Date.now() - start,
      deviceState: { currentChannel: channel },
    };
  }

  public async sendRaw(device: Device, raw: string): Promise<CommandResult> {
    const start = Date.now();
    return {
      success: true,
      command: 'RAW_COMMAND',
      deviceId: device.id,
      message: `Virtual Driver acknowledged raw command: "${raw}"`,
      executionTimeMs: Date.now() - start,
      rawResponse: { echo: raw, timestamp: new Date().toISOString() },
    };
  }

  public override async getTelemetry(device: Device): Promise<DriverTelemetry> {
    const state = this.getState(device);
    // Slight random drift for realistic industrial NOC monitoring telemetry
    const drift = (Math.random() - 0.5) * 0.4;
    state.temperature = Number((state.temperature + drift).toFixed(1));
    return {
      temperature: state.temperature,
      powerState: state.power,
      volume: state.volume,
      inputSource: state.input,
    };
  }
}
