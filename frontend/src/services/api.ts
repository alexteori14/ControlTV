import axios from 'axios';
import { Device, DiscoveredDevice, DashboardStats, AuditLogEntry, CommandHistoryEntry, TelemetryPoint, CommandResult, CommandType } from '../types/index.js';

const API_BASE = '/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token automatically
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('controltv_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept 401 and redirect or clear token
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config.url.includes('/auth/login')) {
      localStorage.removeItem('controltv_token');
      localStorage.removeItem('controltv_user');
      window.dispatchEvent(new Event('auth_logout'));
    }
    return Promise.reject(err);
  }
);

// Auth endpoints
export const authApi = {
  login: async (username: string, password: string) => {
    const res = await apiClient.post('/auth/login', { username, password });
    return res.data;
  },
  me: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },
};

// Device endpoints
export const deviceApi = {
  getAll: async (): Promise<Device[]> => {
    const res = await apiClient.get('/devices');
    return res.data.devices;
  },
  getById: async (id: string): Promise<Device> => {
    const res = await apiClient.get(`/devices/${id}`);
    return res.data.device;
  },
  create: async (data: Partial<Device>): Promise<Device> => {
    const res = await apiClient.post('/devices', data);
    return res.data.device;
  },
  update: async (id: string, data: Partial<Device>): Promise<Device> => {
    const res = await apiClient.put(`/devices/${id}`, data);
    return res.data.device;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/devices/${id}`);
  },
  ping: async (id: string): Promise<{ reachable: boolean; latencyMs: number; error?: string }> => {
    const res = await apiClient.post(`/devices/${id}/ping`);
    return res.data;
  },
};

// Remote Control endpoints
export const controlApi = {
  sendCommand: async (deviceId: string, command: CommandType, payload?: any): Promise<CommandResult> => {
    const res = await apiClient.post(`/control/${deviceId}/command`, { command, payload });
    return res.data;
  },
  setPower: async (deviceId: string, state: 'ON' | 'OFF'): Promise<CommandResult> => {
    const res = await apiClient.post(`/control/${deviceId}/power`, { state });
    return res.data;
  },
  setVolume: async (deviceId: string, volume: number): Promise<CommandResult> => {
    const res = await apiClient.post(`/control/${deviceId}/volume`, { volume });
    return res.data;
  },
  setMute: async (deviceId: string): Promise<CommandResult> => {
    const res = await apiClient.post(`/control/${deviceId}/mute`);
    return res.data;
  },
  setInput: async (deviceId: string, input: string): Promise<CommandResult> => {
    const res = await apiClient.post(`/control/${deviceId}/input`, { input });
    return res.data;
  },
  setBrightness: async (deviceId: string, brightness: number): Promise<CommandResult> => {
    const res = await apiClient.post(`/control/${deviceId}/brightness`, { brightness });
    return res.data;
  },
  openMiracast: async (): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post('/control/miracast');
    return res.data;
  },
};

// Discovery endpoints
export const discoveryApi = {
  getSubnets: async (): Promise<string[]> => {
    const res = await apiClient.get('/discovery/subnets');
    return res.data.subnets;
  },
  getStatus: async (): Promise<{ isScanning: boolean; progress: number; devices: DiscoveredDevice[] }> => {
    const res = await apiClient.get('/discovery/status');
    return res.data;
  },
  startScan: async (subnet: string): Promise<void> => {
    await apiClient.post('/discovery/scan', { subnet });
  },
  importDevice: async (discoveredDevice: DiscoveredDevice, customName?: string, location?: string): Promise<Device> => {
    const res = await apiClient.post('/discovery/import', { discoveredDevice, customName, location });
    return res.data.device;
  },
};

// Telemetry & Stats endpoints
export const telemetryApi = {
  getStats: async (): Promise<DashboardStats> => {
    const res = await apiClient.get('/telemetry/stats');
    return res.data;
  },
  getDeviceTelemetry: async (deviceId: string, limit = 20): Promise<TelemetryPoint[]> => {
    const res = await apiClient.get(`/telemetry/device/${deviceId}?limit=${limit}`);
    return res.data.telemetry;
  },
};

// Audit endpoints
export const auditApi = {
  getLogs: async (deviceId?: string, action?: string, limit = 100): Promise<AuditLogEntry[]> => {
    let url = `/audit/logs?limit=${limit}`;
    if (deviceId) url += `&deviceId=${deviceId}`;
    if (action) url += `&action=${encodeURIComponent(action)}`;
    const res = await apiClient.get(url);
    return res.data.logs;
  },
  getCommandHistory: async (deviceId?: string, limit = 50): Promise<CommandHistoryEntry[]> => {
    let url = `/audit/history?limit=${limit}`;
    if (deviceId) url += `&deviceId=${deviceId}`;
    const res = await apiClient.get(url);
    return res.data.history;
  },
};
