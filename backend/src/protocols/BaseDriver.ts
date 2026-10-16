import net from 'net';
import wol from 'wake_on_lan';
import { Device, CommandResult, InputSource } from '../types/index.js';
import { IDeviceDriver, DriverTelemetry, ConnectivityResult } from './DeviceDriver.js';

export abstract class BaseDriver implements IDeviceDriver {
  abstract name: string;

  public async checkConnectivity(device: Device, timeoutMs: number = 2500): Promise<ConnectivityResult> {
    const startTime = Date.now();
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let resolved = false;

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
          resolve({
            reachable: false,
            latencyMs: Date.now() - startTime,
            error: `Connection to ${device.ip}:${device.port} timed out after ${timeoutMs}ms`,
          });
        }
      }, timeoutMs);

      socket.on('connect', () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          const latency = Date.now() - startTime;
          socket.destroy();
          resolve({
            reachable: true,
            latencyMs: latency,
          });
        }
      });

      socket.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          socket.destroy();
          resolve({
            reachable: false,
            latencyMs: Date.now() - startTime,
            error: err.message,
          });
        }
      });

      try {
        socket.connect(device.port || 80, device.ip);
      } catch (err: any) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve({
            reachable: false,
            latencyMs: Date.now() - startTime,
            error: err.message,
          });
        }
      }
    });
  }

  public async sendWakeOnLan(macAddress?: string): Promise<boolean> {
    if (!macAddress) return false;
    return new Promise((resolve) => {
      wol.wake(macAddress, (error) => {
        if (error) {
          console.error(`[WoL] Failed to send magic packet to ${macAddress}:`, error);
          resolve(false);
        } else {
          console.log(`[WoL] Magic packet sent successfully to ${macAddress}`);
          resolve(true);
        }
      });
    });
  }

  protected async sendTcpCommand(
    ip: string,
    port: number,
    command: string | Buffer,
    timeoutMs: number = 3000
  ): Promise<{ success: boolean; response?: string; error?: string }> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let responseData = '';
      let isDone = false;

      const timer = setTimeout(() => {
        if (!isDone) {
          isDone = true;
          socket.destroy();
          resolve({ success: false, error: `Socket timeout (${timeoutMs}ms)` });
        }
      }, timeoutMs);

      socket.connect(port, ip, () => {
        socket.write(command);
      });

      socket.on('data', (data) => {
        responseData += data.toString('utf8');
        if (!isDone) {
          isDone = true;
          clearTimeout(timer);
          socket.destroy();
          resolve({ success: true, response: responseData });
        }
      });

      socket.on('error', (err) => {
        if (!isDone) {
          isDone = true;
          clearTimeout(timer);
          socket.destroy();
          resolve({ success: false, error: err.message });
        }
      });

      socket.on('close', () => {
        if (!isDone) {
          isDone = true;
          clearTimeout(timer);
          resolve({ success: true, response: responseData });
        }
      });
    });
  }

  // Base default implementations that specific drivers can override
  abstract powerOn(device: Device): Promise<CommandResult>;
  abstract powerOff(device: Device): Promise<CommandResult>;
  abstract restart(device: Device): Promise<CommandResult>;
  abstract setVolume(device: Device, volume: number): Promise<CommandResult>;
  abstract setMute(device: Device, muted: boolean): Promise<CommandResult>;
  abstract setBrightness(device: Device, brightness: number): Promise<CommandResult>;
  abstract setInputSource(device: Device, input: InputSource): Promise<CommandResult>;
  abstract setChannel(device: Device, channel: string): Promise<CommandResult>;
  abstract sendRaw(device: Device, raw: string): Promise<CommandResult>;

  public async sendText(device: Device, text: string): Promise<CommandResult> {
    return this.sendRaw(device, text);
  }

  public async getTelemetry(device: Device): Promise<DriverTelemetry> {
    return {
      temperature: device.temperature,
      powerState: device.powerState,
      volume: device.volume,
      inputSource: device.currentInput,
    };
  }
}
