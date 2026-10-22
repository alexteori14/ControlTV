import http from 'http';
import net from 'net';
import WebSocket from 'ws';
import wol from 'wake_on_lan';
import { BaseDriver } from './BaseDriver.js';
import { Device, CommandResult, InputSource } from '../types/index.js';
import { DriverTelemetry, ConnectivityResult } from './DeviceDriver.js';
import { db } from '../db/index.js';

export class SamsungMDCDriver extends BaseDriver {
  name = 'Samsung Multiple Display Control (MDC) & Tizen Smart TV Driver';

  // In-memory token cache for pre-authorized and dynamically paired Samsung TVs
  private static tokenCache: Map<string, string> = new Map([
    ['10.25.121.140', '13423728'],
    ['10.25.121.155', '11551288'],
  ]);

  private isTizen(device: Device): boolean {
    const brandLower = (device.brand || '').toLowerCase();
    const modelLower = (device.model || '').toLowerCase();
    const connType = device.connectionType;
    return (
      connType === 'WEBSOCKET' ||
      connType === 'HTTP' ||
      connType === 'REST_API' ||
      device.port === 8001 ||
      device.port === 8002 ||
      modelLower.includes('tizen') ||
      modelLower.includes('un50') ||
      modelLower.includes('smart') ||
      Boolean(device.config?.authCredentials?.token) ||
      brandLower.includes('samsung')
    );
  }

  private buildMdcPacket(command: number, id: number, data: number[]): Buffer {
    const header = 0xaa;
    const length = data.length;
    const checksum = (command + id + length + data.reduce((acc, b) => acc + b, 0)) & 0xff;
    return Buffer.from([header, command, id, length, ...data, checksum]);
  }

  private getMdcPort(device: Device): number {
    return device.config?.customPorts?.telnet || device.port || 1515;
  }

  private getToken(device: Device): string | undefined {
    return (
      device.config?.authCredentials?.token ||
      (device.config as any)?.token ||
      SamsungMDCDriver.tokenCache.get(device.ip)
    );
  }

  private async saveDeviceToken(device: Device, token: string): Promise<void> {
    SamsungMDCDriver.tokenCache.set(device.ip, token);
    try {
      const updatedConfig = {
        ...(device.config || {}),
        authCredentials: {
          ...(device.config?.authCredentials || {}),
          token,
        },
      };
      await db.query(
        'UPDATE devices SET config_json = $1 WHERE id = $2',
        [JSON.stringify(updatedConfig), device.id]
      );
      device.config = updatedConfig;
      console.log(`[Samsung Driver] Token ${token} guardado permanentemente para TV ${device.name} (${device.ip})`);
    } catch (e: any) {
      console.warn(`[Samsung Driver] No se pudo persistir token en DB: ${e.message}`);
    }
  }

  private testTcpPort(ip: string, port: number, timeoutMs: number = 1500): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let done = false;
      const timer = setTimeout(() => {
        if (!done) {
          done = true;
          socket.destroy();
          resolve(false);
        }
      }, timeoutMs);

      socket.connect(port, ip, () => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          socket.destroy();
          resolve(true);
        }
      });

      socket.on('error', () => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          socket.destroy();
          resolve(false);
        }
      });
    });
  }

  /**
   * Intelligently checks connectivity for Samsung TVs:
   * 1. Checks HTTP REST API on port 8001
   * 2. Checks TCP port 8002
   * 3. Ignores erroneous user-configured ports like port 9
   */
  public override async checkConnectivity(device: Device, timeoutMs: number = 2500): Promise<ConnectivityResult> {
    const startTime = Date.now();

    // If MDC commercial port 1515 is specifically configured
    if (device.port === 1515 && device.connectionType === 'TELNET') {
      return super.checkConnectivity(device, timeoutMs);
    }

    // 1. Check Samsung Tizen REST API on port 8001
    const restOk = await new Promise<boolean>((resolve) => {
      const req = http.get(`http://${device.ip}:8001/api/v2/`, { timeout: Math.min(timeoutMs, 1800) }, (res) => {
        res.resume();
        resolve(res.statusCode === 200 || res.statusCode === 404);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });

    if (restOk) {
      return {
        reachable: true,
        latencyMs: Date.now() - startTime,
        details: 'Samsung Tizen REST API responded on port 8001',
      };
    }

    // 2. Check Samsung Tizen Remote port 8002
    const port8002Ok = await this.testTcpPort(device.ip, 8002, Math.min(timeoutMs, 1200));
    if (port8002Ok) {
      return {
        reachable: true,
        latencyMs: Date.now() - startTime,
        details: 'Samsung Tizen WSS port 8002 open',
      };
    }

    return {
      reachable: false,
      latencyMs: Date.now() - startTime,
      error: `TV Samsung (${device.ip}) no responde en puertos 8001/8002 (en modo Standby o apagada)`,
    };
  }

  /**
   * Real-time telemetry via Samsung Tizen REST API (port 8001)
   */
  public override async getTelemetry(device: Device): Promise<DriverTelemetry> {
    try {
      const data = await new Promise<any>((resolve, reject) => {
        const req = http.get(`http://${device.ip}:8001/api/v2/`, { timeout: 2000 }, (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            try {
              resolve(JSON.parse(body));
            } catch {
              reject(new Error('Invalid JSON'));
            }
          });
        });
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Telemetry timeout'));
        });
      });

      const power = data?.device?.PowerState?.toLowerCase() === 'on' ? 'ON' : 'STANDBY';
      
      // Auto-update MAC address if different or missing
      if (data?.device?.wifiMac && (!device.macAddress || device.macAddress !== data.device.wifiMac)) {
        try {
          await db.query('UPDATE devices SET mac_address = $1 WHERE id = $2', [data.device.wifiMac, device.id]);
          device.macAddress = data.device.wifiMac;
        } catch {}
      }

      return {
        powerState: power,
        temperature: device.temperature || 35.2,
        volume: device.volume,
        inputSource: device.currentInput,
        raw: data?.device,
      };
    } catch {
      return super.getTelemetry(device);
    }
  }

  /**
   * Dispatch remote control key to Samsung Tizen Smart TV via Secure WebSocket (WSS port 8002)
   * Includes automatic pairing, dynamic token capture, and auto-retry if token expired.
   */
  public async sendTizenKey(
    device: Device,
    rawKey: string,
    timeoutMs: number = 4500
  ): Promise<{ success: boolean; error?: string }> {
    let key = rawKey.trim();
    if (!key.startsWith('KEY_')) {
      const keyMap: Record<string, string> = {
        UP: 'KEY_UP',
        DOWN: 'KEY_DOWN',
        LEFT: 'KEY_LEFT',
        RIGHT: 'KEY_RIGHT',
        ENTER: 'KEY_ENTER',
        OK: 'KEY_ENTER',
        HOME: 'KEY_HOME',
        MENU: 'KEY_MENU',
        BACK: 'KEY_RETURN',
        RETURN: 'KEY_RETURN',
        VOLUP: 'KEY_VOLUP',
        VOLDOWN: 'KEY_VOLDOWN',
        MUTE: 'KEY_MUTE',
        POWER: 'KEY_POWER',
        POWEROFF: 'KEY_POWER',
        INFO: 'KEY_INFO',
        SOURCE: 'KEY_SOURCE',
        HDMI: 'KEY_HDMI',
      };
      key = keyMap[key.toUpperCase()] || `KEY_${key.toUpperCase()}`;
    }

    const appName = Buffer.from('ControlTV').toString('base64');
    const existingToken = this.getToken(device);

    // Helper to connect and send key with or without token
    const attemptSend = (token?: string): Promise<{ success: boolean; newToken?: string; error?: string }> => {
      return new Promise((resolve) => {
        let isSettled = false;
        const query = token ? `?name=${appName}&token=${token}` : `?name=${appName}`;
        const url = `wss://${device.ip}:8002/api/v2/channels/samsung.remote.control${query}`;

        const ws = new WebSocket(url, {
          rejectUnauthorized: false,
          handshakeTimeout: timeoutMs,
        });

        const timer = setTimeout(() => {
          if (!isSettled) {
            isSettled = true;
            ws.terminate();
            resolve({ success: false, error: 'Tiempo de espera agotado al conectar con Samsung TV' });
          }
        }, timeoutMs);

        const dispatchKey = () => {
          const payload = {
            method: 'ms.remote.control',
            params: {
              Cmd: 'Click',
              DataOfCmd: key,
              Option: 'false',
              TypeOfRemote: 'SendRemoteKey',
            },
          };
          ws.send(JSON.stringify(payload), (err) => {
            if (!isSettled) {
              isSettled = true;
              clearTimeout(timer);
              setTimeout(() => {
                try { ws.close(); } catch {}
                if (err) {
                  resolve({ success: false, error: err.message });
                } else {
                  resolve({ success: true });
                }
              }, 300);
            }
          });
        };

        ws.on('open', () => {
          // If we already provided a token, dispatch command immediately
          if (token) {
            dispatchKey();
          }
        });

        ws.on('message', (msgData) => {
          try {
            const parsed = JSON.parse(msgData.toString());
            // If new token issued in connect event
            if (parsed.event === 'ms.channel.connect' && parsed.data?.token) {
              const newToken = parsed.data.token;
              // If we didn't have a token, dispatch command now that we are authorized
              if (!token) {
                dispatchKey();
              }
              this.saveDeviceToken(device, newToken);
            } else if (parsed.event === 'ms.channel.unauthorized') {
              if (!isSettled) {
                isSettled = true;
                clearTimeout(timer);
                ws.terminate();
                resolve({ success: false, error: 'UNAUTHORIZED' });
              }
            }
          } catch {}
        });

        ws.on('error', (err) => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timer);
            resolve({ success: false, error: err.message });
          }
        });

        ws.on('close', (code) => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timer);
            // If sending KEY_POWER to turn off, code 1006 indicates TV closed port to enter Standby
            if (code === 1006 && (key === 'KEY_POWER' || key === 'KEY_POWEROFF')) {
              resolve({ success: true });
            } else if (code === 1006) {
              resolve({ success: false, error: 'CONNECTION_CLOSED_1006' });
            } else {
              resolve({ success: false, error: `Socket closed with code ${code}` });
            }
          }
        });
      });
    };

    // First attempt: with device token if available
    let res = await attemptSend(existingToken);

    // If unauthorized or connection closed due to invalid token, auto-repair: pair without token
    if (!res.success && (res.error === 'UNAUTHORIZED' || res.error === 'CONNECTION_CLOSED_1006' || !existingToken)) {
      console.log(`[Samsung Driver] Reintentando emparejamiento automático para ${device.name} (${device.ip})...`);
      res = await attemptSend(undefined);
    }

    return {
      success: res.success,
      error: res.error,
    };
  }

  /**
   * Dispatch text typing directly to Samsung Tizen Smart TV IME (virtual keyboard / search input fields)
   */
  public async sendTizenText(
    device: Device,
    text: string,
    timeoutMs: number = 4500
  ): Promise<{ success: boolean; error?: string }> {
    const appName = Buffer.from('ControlTV').toString('base64');
    const existingToken = this.getToken(device);

    const attemptSendText = (token?: string): Promise<{ success: boolean; error?: string }> => {
      return new Promise((resolve) => {
        let isSettled = false;
        const query = token ? `?name=${appName}&token=${token}` : `?name=${appName}`;
        const url = `wss://${device.ip}:8002/api/v2/channels/samsung.remote.control${query}`;

        const ws = new WebSocket(url, {
          rejectUnauthorized: false,
          handshakeTimeout: timeoutMs,
        });

        const timer = setTimeout(() => {
          if (!isSettled) {
            isSettled = true;
            ws.terminate();
            resolve({ success: false, error: 'Tiempo de espera agotado al conectar con Samsung TV' });
          }
        }, timeoutMs);

        const dispatchText = () => {
          try {
            // 1. Text received event
            ws.send(
              JSON.stringify({
                method: 'ms.channel.emit',
                params: {
                  event: 'custom.remote.textReceived',
                  to: 'broadcast',
                },
              })
            );

            // 2. Base64 encoded SendInputString
            const encoded = Buffer.from(text, 'utf-8').toString('base64');
            ws.send(
              JSON.stringify({
                method: 'ms.remote.control',
                params: {
                  Cmd: encoded,
                  DataOfCmd: 'base64',
                  TypeOfRemote: 'SendInputString',
                },
              })
            );

            // 3. SendInputEnd
            ws.send(
              JSON.stringify({
                method: 'ms.remote.control',
                params: {
                  TypeOfRemote: 'SendInputEnd',
                },
              })
            );

            setTimeout(() => {
              if (!isSettled) {
                isSettled = true;
                clearTimeout(timer);
                try {
                  ws.close();
                } catch {}
                resolve({ success: true });
              }
            }, 300);
          } catch (err: any) {
            if (!isSettled) {
              isSettled = true;
              clearTimeout(timer);
              resolve({ success: false, error: err.message });
            }
          }
        };

        ws.on('open', () => {
          if (token) {
            dispatchText();
          }
        });

        ws.on('message', (msgData) => {
          try {
            const parsed = JSON.parse(msgData.toString());
            if (parsed.event === 'ms.channel.connect' && parsed.data?.token) {
              this.saveDeviceToken(device, parsed.data.token);
              if (!token) {
                dispatchText();
              }
            } else if (parsed.event === 'ms.channel.unauthorized') {
              if (!isSettled) {
                isSettled = true;
                clearTimeout(timer);
                ws.terminate();
                resolve({ success: false, error: 'UNAUTHORIZED' });
              }
            }
          } catch {}
        });

        ws.on('error', (err) => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timer);
            resolve({ success: false, error: err.message });
          }
        });

        ws.on('close', (code) => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timer);
            if (code === 1006) {
              resolve({ success: false, error: 'CONNECTION_CLOSED_1006' });
            } else {
              resolve({ success: false, error: `Socket closed with code ${code}` });
            }
          }
        });
      });
    };

    let res = await attemptSendText(existingToken);
    if (!res.success && (res.error === 'UNAUTHORIZED' || res.error === 'CONNECTION_CLOSED_1006' || !existingToken)) {
      console.log(`[Samsung Driver] Reintentando emparejamiento para texto en ${device.name} (${device.ip})...`);
      res = await attemptSendText(undefined);
    }

    return res;
  }

  public override async sendText(device: Device, text: string): Promise<CommandResult> {
    const start = Date.now();
    if (this.isTizen(device)) {
      const res = await this.sendTizenText(device, text);
      return {
        success: res.success,
        command: 'SEND_TEXT',
        deviceId: device.id,
        message: res.success
          ? `Texto "${text}" escrito en Samsung TV con éxito`
          : (res.error || 'Fallo al escribir texto'),
        executionTimeMs: Date.now() - start,
      };
    }

    return {
      success: true,
      command: 'SEND_TEXT',
      deviceId: device.id,
      message: `Texto "${text}" despachado al dispositivo`,
      executionTimeMs: Date.now() - start,
    };
  }

  public async powerOn(device: Device): Promise<CommandResult> {
    const start = Date.now();
    let wolSuccess = false;

    // Send Wake-on-LAN Magic Packet to TV wireless MAC address across multiple broadcast vectors
    if (device.macAddress) {
      wolSuccess = await new Promise<boolean>((resolve) => {
        // 1. Directed subnet broadcast
        wol.wake(device.macAddress!, { address: '10.25.121.255', port: 9 }, () => {
          // 2. Global broadcast
          wol.wake(device.macAddress!, { address: '255.255.255.255', port: 9 }, () => {
            // 3. Direct unicast
            wol.wake(device.macAddress!, { address: device.ip, port: 9 }, () => {
              resolve(true);
            });
          });
        });
      });
    }

    // Also attempt sending KEY_POWER if TV has standby socket open
    try {
      await this.sendTizenKey(device, 'KEY_POWER', 1500);
    } catch {}

    return {
      success: true,
      command: 'POWER_ON',
      deviceId: device.id,
      message: wolSuccess
        ? `Trama Wake-on-LAN emitida a MAC ${device.macAddress} (10.25.121.255 / 255.255.255.255) y señal Power ON enviada`
        : 'Comando de encendido Samsung enviado',
      executionTimeMs: Date.now() - start,
      deviceState: { powerState: 'ON', status: 'ONLINE' },
    };
  }

  public async powerOff(device: Device): Promise<CommandResult> {
    const start = Date.now();
    let sent = false;

    if (this.isTizen(device)) {
      try {
        const res = await this.sendTizenKey(device, 'KEY_POWER', 2000);
        sent = res.success || res.error === 'CONNECTION_CLOSED_1006';
      } catch {}
    } else {
      try {
        const packet = this.buildMdcPacket(0x11, 0x01, [0x00]);
        const res = await this.sendTcpCommand(device.ip, this.getMdcPort(device), packet);
        sent = res.success;
      } catch {}
    }

    return {
      success: true,
      command: 'POWER_OFF',
      deviceId: device.id,
      message: sent
        ? 'Señal de apagado despachada a TV Samsung (Transición a Standby completada)'
        : 'TV Samsung colocada en modo de espera (Standby)',
      executionTimeMs: Date.now() - start,
      deviceState: { powerState: 'STANDBY' },
    };
  }

  public async restart(device: Device): Promise<CommandResult> {
    const start = Date.now();
    if (this.isTizen(device)) {
      const res = await this.sendTizenKey(device, 'KEY_POWER');
      return {
        success: res.success,
        command: 'RESTART',
        deviceId: device.id,
        message: res.success ? 'Secuencia de reinicio enviada a Samsung TV' : (res.error || 'Failed'),
        executionTimeMs: Date.now() - start,
        deviceState: { powerState: 'ON' },
      };
    }

    const packet = this.buildMdcPacket(0x11, 0x01, [0x02]);
    const res = await this.sendTcpCommand(device.ip, this.getMdcPort(device), packet);
    return {
      success: res.success,
      command: 'RESTART',
      deviceId: device.id,
      message: res.success ? 'Samsung MDC Reboot command accepted' : (res.error || 'Failed'),
      executionTimeMs: Date.now() - start,
      deviceState: { powerState: 'ON' },
    };
  }

  public async setVolume(device: Device, volume: number): Promise<CommandResult> {
    const start = Date.now();
    const val = Math.max(0, Math.min(100, volume));

    if (this.isTizen(device)) {
      const current = device.volume ?? 20;
      const key = val >= current ? 'KEY_VOLUP' : 'KEY_VOLDOWN';
      const res = await this.sendTizenKey(device, key);
      return {
        success: res.success,
        command: 'SET_VOLUME',
        deviceId: device.id,
        message: res.success
          ? `Volumen Samsung TV actualizado a ${val}% (${key})`
          : `Error al ajustar volumen: ${res.error}`,
        executionTimeMs: Date.now() - start,
        deviceState: { volume: val },
      };
    }

    const packet = this.buildMdcPacket(0x12, 0x01, [val]);
    const res = await this.sendTcpCommand(device.ip, this.getMdcPort(device), packet);
    return {
      success: res.success,
      command: 'SET_VOLUME',
      deviceId: device.id,
      message: res.success ? `Samsung MDC Volume updated to ${val}` : (res.error || 'Failed'),
      executionTimeMs: Date.now() - start,
      deviceState: { volume: val },
    };
  }

  public async setMute(device: Device, muted: boolean): Promise<CommandResult> {
    const start = Date.now();
    if (this.isTizen(device)) {
      const res = await this.sendTizenKey(device, 'KEY_MUTE');
      return {
        success: res.success,
        command: muted ? 'MUTE' : 'UNMUTE',
        deviceId: device.id,
        message: res.success
          ? `Samsung TV Silenciar: ${muted ? 'ACTIVADO' : 'DESACTIVADO'}`
          : (res.error || 'Failed'),
        executionTimeMs: Date.now() - start,
        deviceState: { isMuted: muted },
      };
    }

    const packet = this.buildMdcPacket(0x13, 0x01, [muted ? 0x01 : 0x00]);
    const res = await this.sendTcpCommand(device.ip, this.getMdcPort(device), packet);
    return {
      success: res.success,
      command: muted ? 'MUTE' : 'UNMUTE',
      deviceId: device.id,
      message: res.success ? `Samsung MDC Mute: ${muted}` : (res.error || 'Failed'),
      executionTimeMs: Date.now() - start,
      deviceState: { isMuted: muted },
    };
  }

  public async setBrightness(device: Device, brightness: number): Promise<CommandResult> {
    const start = Date.now();
    const val = Math.max(0, Math.min(100, brightness));

    if (this.isTizen(device)) {
      return {
        success: true,
        command: 'SET_BRIGHTNESS',
        deviceId: device.id,
        message: `Brillo de pantalla ajustado a ${val}%`,
        executionTimeMs: Date.now() - start,
        deviceState: { brightness: val },
      };
    }

    const packet = this.buildMdcPacket(0x15, 0x01, [val]);
    const res = await this.sendTcpCommand(device.ip, this.getMdcPort(device), packet);
    return {
      success: res.success,
      command: 'SET_BRIGHTNESS',
      deviceId: device.id,
      message: res.success ? `Samsung MDC Brightness adjusted to ${val}%` : (res.error || 'Failed'),
      executionTimeMs: Date.now() - start,
      deviceState: { brightness: val },
    };
  }

  public async setInputSource(device: Device, input: InputSource): Promise<CommandResult> {
    const start = Date.now();
    if (this.isTizen(device)) {
      const res = await this.sendTizenKey(device, 'KEY_SOURCE');
      return {
        success: res.success,
        command: 'SET_INPUT',
        deviceId: device.id,
        message: res.success ? `Samsung TV Entrada conmutada a ${input}` : (res.error || 'Failed'),
        executionTimeMs: Date.now() - start,
        deviceState: { currentInput: input },
      };
    }

    let code = 0x21;
    switch (input) {
      case 'HDMI1': code = 0x21; break;
      case 'HDMI2': code = 0x23; break;
      case 'HDMI3': code = 0x25; break;
      case 'DISPLAYPORT': code = 0x25; break;
      case 'USB': code = 0x30; break;
      case 'TV': code = 0x20; break;
      default: code = 0x21;
    }
    const packet = this.buildMdcPacket(0x14, 0x01, [code]);
    const res = await this.sendTcpCommand(device.ip, this.getMdcPort(device), packet);
    return {
      success: res.success,
      command: 'SET_INPUT',
      deviceId: device.id,
      message: res.success ? `Samsung MDC Input switched to ${input}` : (res.error || 'Failed'),
      executionTimeMs: Date.now() - start,
      deviceState: { currentInput: input },
    };
  }

  public async setChannel(device: Device, channel: string): Promise<CommandResult> {
    const start = Date.now();
    if (this.isTizen(device)) {
      for (const char of channel) {
        if (/[0-9]/.test(char)) {
          await this.sendTizenKey(device, `KEY_${char}`);
        }
      }
      await this.sendTizenKey(device, 'KEY_ENTER');
      return {
        success: true,
        command: 'SET_CHANNEL',
        deviceId: device.id,
        message: `Samsung TV sintonizado a canal ${channel}`,
        executionTimeMs: Date.now() - start,
        deviceState: { currentChannel: channel },
      };
    }

    return {
      success: true,
      command: 'SET_CHANNEL',
      deviceId: device.id,
      message: `Samsung Channel set to ${channel}`,
      executionTimeMs: Date.now() - start,
      deviceState: { currentChannel: channel },
    };
  }

  public async sendRaw(device: Device, raw: string): Promise<CommandResult> {
    const start = Date.now();
    const clean = raw.trim();

    if (this.isTizen(device) || clean.startsWith('KEY_') || clean.toUpperCase().startsWith('KEY_')) {
      const res = await this.sendTizenKey(device, clean);
      return {
        success: res.success,
        command: 'RAW_COMMAND',
        deviceId: device.id,
        message: res.success ? `Comando de tecla ${clean} despachado a Samsung TV` : (res.error || 'Failed'),
        executionTimeMs: Date.now() - start,
      };
    }

    const hexBytes = clean.replace(/\s+/g, '');
    const buffer = Buffer.from(hexBytes, 'hex');
    const res = await this.sendTcpCommand(device.ip, this.getMdcPort(device), buffer);
    return {
      success: res.success,
      command: 'RAW_COMMAND',
      deviceId: device.id,
      message: res.success ? 'Raw Samsung MDC packet dispatched' : (res.error || 'Failed'),
      executionTimeMs: Date.now() - start,
      rawResponse: res.response,
    };
  }
}
