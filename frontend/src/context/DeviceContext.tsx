import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Device, DashboardStats, CommandType, CommandResult, ScreenCapture } from '../types/index.js';
import { deviceApi, controlApi, telemetryApi } from '../services/api.js';
import { socketService } from '../services/socket.js';
import { useAuth } from './AuthContext.js';

interface DeviceContextType {
  devices: Device[];
  selectedDevice: Device | null;
  stats: DashboardStats | null;
  isLoading: boolean;
  isSocketConnected: boolean;
  lastCommandResult: CommandResult | null;
  latestCapture: ScreenCapture | null;
  setSelectedDevice: (device: Device | null) => void;
  refreshDevices: () => Promise<void>;
  refreshStats: () => Promise<void>;
  executeCommand: (deviceId: string, command: CommandType, payload?: any) => Promise<CommandResult>;
  quickPower: (deviceId: string, state: 'ON' | 'OFF') => Promise<void>;
  quickVolume: (deviceId: string, volume: number) => Promise<void>;
  quickMute: (deviceId: string) => Promise<void>;
  quickInput: (deviceId: string, input: string) => Promise<void>;
  pingDevice: (deviceId: string) => Promise<boolean>;
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export const DeviceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [lastCommandResult, setLastCommandResult] = useState<CommandResult | null>(null);
  const [latestCapture, setLatestCapture] = useState<ScreenCapture | null>(null);

  const refreshDevices = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setIsLoading(true);
      const list = await deviceApi.getAll();
      setDevices(list);
      // Keep selected device synced
      if (selectedDevice) {
        const found = list.find((d) => d.id === selectedDevice.id);
        if (found) setSelectedDevice(found);
      }
    } catch (err) {
      console.error('Error fetching devices:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, selectedDevice]);

  const refreshStats = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await telemetryApi.getStats();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, [isAuthenticated]);

  // Initial load and WebSocket setup
  useEffect(() => {
    if (!isAuthenticated) return;

    refreshDevices();
    refreshStats();

    const socket = socketService.connect();

    const onConnect = () => setIsSocketConnected(true);
    const onDisconnect = () => setIsSocketConnected(false);

    const onDeviceUpdated = (updated: Device) => {
      setDevices((prev) =>
        prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d))
      );
      setSelectedDevice((curr) => (curr && curr.id === updated.id ? updated : curr));
    };

    const onDeviceCreated = (created: Device) => {
      setDevices((prev) => [...prev, created]);
      refreshStats();
    };

    const onDeviceDeleted = ({ id }: { id: string }) => {
      setDevices((prev) => prev.filter((d) => d.id !== id));
      setSelectedDevice((curr) => (curr && curr.id === id ? null : curr));
      refreshStats();
    };

    const onCommandExecuted = (res: CommandResult) => {
      setLastCommandResult(res);
      if (res.screenshot) {
        setLatestCapture({
          id: String(Date.now()),
          deviceId: res.deviceId,
          command: res.command,
          screenshot: res.screenshot,
          width: 1920,
          height: 1080,
          timestamp: res.screenshotTimestamp || new Date().toISOString(),
          source: 'TV_HARDWARE_RENDER',
        });
      }
      refreshStats();
    };

    const onScreenCaptured = (data: { deviceId: string; command: string; capture: ScreenCapture }) => {
      if (data?.capture) {
        setLatestCapture(data.capture);
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('device_updated', onDeviceUpdated);
    socket.on('device_created', onDeviceCreated);
    socket.on('device_deleted', onDeviceDeleted);
    socket.on('command_executed', onCommandExecuted);
    socket.on('screen_captured', onScreenCaptured);

    setIsSocketConnected(socket.connected);

    // Periodic stats polling
    const timer = setInterval(() => {
      refreshStats();
    }, 15000);

    return () => {
      clearInterval(timer);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('device_updated', onDeviceUpdated);
      socket.off('device_created', onDeviceCreated);
      socket.off('device_deleted', onDeviceDeleted);
      socket.off('command_executed', onCommandExecuted);
      socket.off('screen_captured', onScreenCaptured);
    };
  }, [isAuthenticated]);

  const executeCommand = async (
    deviceId: string,
    command: CommandType,
    payload?: any
  ): Promise<CommandResult> => {
    try {
      const res = await controlApi.sendCommand(deviceId, command, payload);
      setLastCommandResult(res);
      return res;
    } catch (err: any) {
      const errRes: CommandResult = {
        success: false,
        command,
        deviceId,
        message: err.response?.data?.message || err.message,
        executionTimeMs: 0,
      };
      setLastCommandResult(errRes);
      return errRes;
    }
  };

  const quickPower = async (deviceId: string, state: 'ON' | 'OFF') => {
    await controlApi.setPower(deviceId, state);
  };

  const quickVolume = async (deviceId: string, volume: number) => {
    await controlApi.setVolume(deviceId, volume);
  };

  const quickMute = async (deviceId: string) => {
    await controlApi.setMute(deviceId);
  };

  const quickInput = async (deviceId: string, input: string) => {
    await controlApi.setInput(deviceId, input);
  };

  const pingDevice = async (deviceId: string): Promise<boolean> => {
    try {
      const res = await deviceApi.ping(deviceId);
      return res.reachable;
    } catch {
      return false;
    }
  };

  return (
    <DeviceContext.Provider
      value={{
        devices,
        selectedDevice,
        stats,
        isLoading,
        isSocketConnected,
        lastCommandResult,
        latestCapture,
        setSelectedDevice,
        refreshDevices,
        refreshStats,
        executeCommand,
        quickPower,
        quickVolume,
        quickMute,
        quickInput,
        pingDevice,
      }}
    >
      {children}
    </DeviceContext.Provider>
  );
};

export const useDevices = (): DeviceContextType => {
  const context = useContext(DeviceContext);
  if (!context) {
    throw new Error('useDevices must be used within a DeviceProvider');
  }
  return context;
};
