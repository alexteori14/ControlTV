import { Device, CommandResult, InputSource, PowerState } from '../types/index.js';

export interface DriverTelemetry {
  temperature?: number;
  powerState?: PowerState;
  volume?: number;
  inputSource?: InputSource;
  raw?: any;
}

export interface ConnectivityResult {
  reachable: boolean;
  latencyMs: number;
  error?: string;
  details?: string;
}

export interface IDeviceDriver {
  checkConnectivity(device: Device, timeoutMs?: number): Promise<ConnectivityResult>;
  powerOn(device: Device): Promise<CommandResult>;
  powerOff(device: Device): Promise<CommandResult>;
  restart(device: Device): Promise<CommandResult>;
  setVolume(device: Device, volume: number): Promise<CommandResult>;
  setMute(device: Device, muted: boolean): Promise<CommandResult>;
  setBrightness(device: Device, brightness: number): Promise<CommandResult>;
  setInputSource(device: Device, input: InputSource): Promise<CommandResult>;
  setChannel(device: Device, channel: string): Promise<CommandResult>;
  sendRaw(device: Device, raw: string): Promise<CommandResult>;
  sendText?(device: Device, text: string): Promise<CommandResult>;
  getTelemetry(device: Device): Promise<DriverTelemetry>;
}
