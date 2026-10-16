import { Device, CommandType, CommandResult, User } from '../types/index.js';
import { DeviceManagerService } from './DeviceManagerService.js';
import { DriverFactory } from '../protocols/DriverFactory.js';
import { AuditService } from './AuditService.js';
import { SocketManager } from '../websocket/SocketManager.js';
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

    // Requirement 3: "Validar conectividad antes de enviar comandos"
    // Exception: POWER_ON might use Wake-on-LAN which is sent to an offline/standby TV.
    let isReachable = true;
    if (command !== 'POWER_ON') {
      const connectivity = await driver.checkConnectivity(device, CONFIG.PING_TIMEOUT_MS);
      if (!connectivity.reachable) {
        const failureResult: CommandResult = {
          success: false,
          command,
          deviceId,
          message: `Device unreachable at ${device.ip}:${device.port}. Command aborted. (${connectivity.error || 'Timeout'})`,
          executionTimeMs: Date.now() - startTime,
        };

        // Mark device OFFLINE
        await DeviceManagerService.updateDeviceState(deviceId, { status: 'OFFLINE' });

        // Audit log & history
        await AuditService.logCommand({
          userId: user.id,
          username: user.username || 'System',
          deviceId,
          deviceName: device.name,
          command,
          params: payload,
          resultStatus: 'FAILED',
          resultMessage: failureResult.message,
          executionTimeMs: failureResult.executionTimeMs,
        });

        await AuditService.logAction({
          userId: user.id,
          username: user.username || 'System',
          deviceId,
          deviceName: device.name,
          action: `CMD_${command}`,
          details: `Aborted: Device unreachable (${connectivity.error})`,
          status: 'FAILED',
          ipAddress: clientIp,
        });

        SocketManager.broadcast('command_executed', failureResult);
        return failureResult;
      }
    }

    // Dispatch command to appropriate protocol driver
    let result: CommandResult;
    try {
      switch (command) {
        case 'POWER_ON':
          result = await driver.powerOn(device);
          break;
        case 'POWER_OFF':
          result = await driver.powerOff(device);
          break;
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
          result = await driver.setVolume(device, Math.min(100, device.volume + 5));
          break;
        case 'VOLUME_DOWN':
          result = await driver.setVolume(device, Math.max(0, device.volume - 5));
          break;
        case 'SET_BRIGHTNESS':
          result = await driver.setBrightness(device, Number(payload.brightness ?? 80));
          break;
        case 'BRIGHTNESS_UP':
          result = await driver.setBrightness(device, Math.min(100, device.brightness + 5));
          break;
        case 'BRIGHTNESS_DOWN':
          result = await driver.setBrightness(device, Math.max(0, device.brightness - 5));
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
      result = {
        success: false,
        command,
        deviceId,
        message: `Command execution exception: ${err.message}`,
        executionTimeMs: Date.now() - startTime,
      };
    }

    // Apply updated state to DB if successful
    if (result.success && result.deviceState) {
      await DeviceManagerService.updateDeviceState(deviceId, result.deviceState);
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
