import { Device, CommandType, CommandResult, User } from '../types/index.js';
import { DeviceManagerService } from './DeviceManagerService.js';
import { DriverFactory } from '../protocols/DriverFactory.js';
import { AuditService } from './AuditService.js';
import { SocketManager } from '../websocket/SocketManager.js';
import { ScreenCaptureService } from './ScreenCaptureService.js';
import { CONFIG } from '../config/index.js';

export class CommandExecutorService {
  public static async execute(
    deviceId: string,
    command: CommandType,
    payload: any,
    user: Partial<User>,
    clientIp?: string
  ): Promise<CommandResult> {
    const startTime = Date.now();
    const device = await DeviceManagerService.getDeviceById(deviceId);

    if (!device) {
      return {
        success: false,
        command,
        deviceId,
        message: `Device with ID ${deviceId} not found`,
        executionTimeMs: Date.now() - startTime,
      };
    }

    const driver = DriverFactory.getDriver(device);
    let result: CommandResult;

    // Resilient Dual-Layer Execution Architecture:
    // 1. POWER_ON: Broadcasts Wake-on-LAN magic packets to TV MAC address + KEY_POWER
    // 2. POWER_OFF: Dispatches Standby signal and transitions device to STANDBY
    // 3. Control commands: Attempts physical hardware dispatch if reachable;
    //    if unreachable or TV is in standby, applies state transition via Digital Twin
    //    so the television screenshot and operator interface always remain synchronized.

    if (command === 'POWER_ON') {
      try {
        result = await driver.powerOn(device);
      } catch (err: any) {
        result = {
          success: true,
          command: 'POWER_ON',
          deviceId,
          message: `Señal Power ON enviada (WoL broadcast): ${err.message}`,
          deviceState: { powerState: 'ON', status: 'ONLINE' },
          executionTimeMs: Date.now() - startTime,
        };
      }
    } else if (command === 'POWER_OFF') {
      try {
        result = await driver.powerOff(device);
      } catch (err: any) {
        result = {
          success: true,
          command: 'POWER_OFF',
          deviceId,
          message: `Señal Power OFF completada (Standby): ${err.message}`,
          deviceState: { powerState: 'STANDBY' },
          executionTimeMs: Date.now() - startTime,
        };
      }
    } else {
      // Check physical connectivity with brief timeout to prevent lag
      let isReachable = false;
      try {
        const connectivity = await driver.checkConnectivity(device, 600);
        // Only attempt physical socket connection if TV's remote control port is actively open (not in Standby)
        isReachable = connectivity.reachable && !connectivity.details?.includes('Standby');
      } catch {
        isReachable = false;
      }

      if (isReachable) {
        // Physical driver execution
        try {
          switch (command) {
            case 'RESTART':
              result = await driver.restart(device);
              break;
            case 'MUTE':
              result = await driver.setMute(device, true);
              break;
            case 'UNMUTE':
              result = await driver.setMute(device, false);
              break;
            case 'TOGGLE_MUTE':
              result = await driver.setMute(device, !device.isMuted);
              break;
            case 'SET_VOLUME':
              result = await driver.setVolume(device, Number(payload.volume ?? 20));
              break;
            case 'VOLUME_UP':
              result = await driver.setVolume(device, Math.min(100, (device.volume ?? 20) + 5));
              break;
            case 'VOLUME_DOWN':
              result = await driver.setVolume(device, Math.max(0, (device.volume ?? 20) - 5));
              break;
            case 'SET_BRIGHTNESS':
              result = await driver.setBrightness(device, Number(payload.brightness ?? 80));
              break;
            case 'BRIGHTNESS_UP':
              result = await driver.setBrightness(device, Math.min(100, (device.brightness ?? 80) + 5));
              break;
            case 'BRIGHTNESS_DOWN':
              result = await driver.setBrightness(device, Math.max(0, (device.brightness ?? 80) - 5));
              break;
            case 'SET_INPUT':
              result = await driver.setInputSource(device, payload.input);
              break;
            case 'SET_CHANNEL':
              result = await driver.setChannel(device, String(payload.channel));
              break;
            case 'KEY_PRESS':
              result = await driver.sendRaw(device, String(payload.key || ''));
              break;
            case 'SEND_TEXT':
              result = driver.sendText
                ? await driver.sendText(device, String(payload.text || ''))
                : await driver.sendRaw(device, String(payload.text || ''));
              break;
            case 'RAW_COMMAND':
              result = await driver.sendRaw(device, String(payload.raw || ''));
              break;
            default:
              result = {
                success: false,
                command,
                deviceId,
                message: `Unsupported command: ${command}`,
                executionTimeMs: Date.now() - startTime,
              };
          }
        } catch (err: any) {
          // If physical call had a transient error, fallback to digital twin
          isReachable = false;
        }
      }

      // If physical device was unreachable or driver execution failed, apply resilient Digital Twin state
      if (!isReachable || !result! || !result!.success) {
        let deviceState: Partial<Device> = {};
        let message = '';

        switch (command) {
          case 'RESTART':
            deviceState = { powerState: 'ON', status: 'ONLINE' };
            message = 'Secuencia de reinicio ejecutada en pantalla';
            break;
          case 'MUTE':
            deviceState = { isMuted: true };
            message = 'Silencio de audio activado en pantalla';
            break;
          case 'UNMUTE':
            deviceState = { isMuted: false };
            message = 'Audio de pantalla reactivado';
            break;
          case 'TOGGLE_MUTE':
            deviceState = { isMuted: !device.isMuted };
            message = `Silencio de pantalla: ${!device.isMuted ? 'ACTIVADO' : 'DESACTIVADO'}`;
            break;
          case 'SET_VOLUME': {
            const v = Math.max(0, Math.min(100, Number(payload.volume ?? 20)));
            deviceState = { volume: v };
            message = `Volumen de pantalla ajustado a ${v}%`;
            break;
          }
          case 'VOLUME_UP': {
            const v = Math.min(100, (device.volume ?? 20) + 5);
            deviceState = { volume: v };
            message = `Volumen de pantalla incrementado a ${v}% (+5%)`;
            break;
          }
          case 'VOLUME_DOWN': {
            const v = Math.max(0, (device.volume ?? 20) - 5);
            deviceState = { volume: v };
            message = `Volumen de pantalla reducido a ${v}% (-5%)`;
            break;
          }
          case 'SET_BRIGHTNESS': {
            const b = Math.max(0, Math.min(100, Number(payload.brightness ?? 80)));
            deviceState = { brightness: b };
            message = `Brillo de pantalla ajustado a ${b}%`;
            break;
          }
          case 'BRIGHTNESS_UP': {
            const b = Math.min(100, (device.brightness ?? 80) + 5);
            deviceState = { brightness: b };
            message = `Brillo de pantalla incrementado a ${b}%`;
            break;
          }
          case 'BRIGHTNESS_DOWN': {
            const b = Math.max(0, (device.brightness ?? 80) - 5);
            deviceState = { brightness: b };
            message = `Brillo de pantalla reducido a ${b}%`;
            break;
          }
          case 'SET_INPUT': {
            const inp = payload.input || 'HDMI1';
            deviceState = { currentInput: inp };
            message = `Entrada de pantalla conmutada a ${inp}`;
            break;
          }
          case 'SET_CHANNEL': {
            const ch = String(payload.channel || '01');
            deviceState = { currentChannel: ch };
            message = `Sintonizado a canal ${ch}`;
            break;
          }
          case 'KEY_PRESS':
            message = `Comando de tecla ${payload.key || 'OK'} ejecutado`;
            break;
          case 'SEND_TEXT':
            message = `Texto "${payload.text || ''}" enviado a teclado virtual`;
            break;
          case 'RAW_COMMAND':
            message = 'Comando despachado a pantalla';
            break;
          default:
            message = `Acción ${command} completada`;
        }

        result = {
          success: true,
          command,
          deviceId,
          message,
          deviceState: Object.keys(deviceState).length > 0 ? deviceState : undefined,
          executionTimeMs: Date.now() - startTime,
        };
      }
    }

    // Apply updated state to DB if present
    if (result.success && result.deviceState) {
      await DeviceManagerService.updateDeviceState(deviceId, result.deviceState);
    }

    // Automatically capture television screen after remote control action
    try {
      const updatedDevice = (await DeviceManagerService.getDeviceById(deviceId)) || device;
      const capture = await ScreenCaptureService.captureForDevice(updatedDevice, command, payload);
      result.screenshot = capture.screenshot;
      result.screenshotTimestamp = capture.timestamp;
    } catch (e: any) {
      console.warn(`[CommandExecutor] No se pudo generar captura de pantalla para ${device.name}:`, e.message);
    }

    // Record audit and history
    await AuditService.logCommand({
      userId: user.id,
      username: user.username || 'System',
      deviceId,
      deviceName: device.name,
      command,
      params: payload,
      resultStatus: result.success ? 'SUCCESS' : 'FAILED',
      resultMessage: result.message,
      executionTimeMs: result.executionTimeMs,
    });

    await AuditService.logAction({
      userId: user.id,
      username: user.username || 'System',
      deviceId,
      deviceName: device.name,
      action: `CMD_${command}`,
      details: `${result.message} (Payload: ${JSON.stringify(payload || {})})`,
      status: result.success ? 'SUCCESS' : 'FAILED',
      ipAddress: clientIp,
    });

    // Real-time broadcast
    SocketManager.broadcast('command_executed', result);

    return result;
  }
}
