export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'OPERATOR';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  fullName: string;
}

export type ConnectionType = 
  | 'HTTP' 
  | 'HTTPS' 
  | 'WEBSOCKET' 
  | 'TELNET' 
  | 'REST_API' 
  | 'SNMP' 
  | 'PJLINK'
  | 'VIRTUAL';

export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'CONNECTING' | 'ERROR';
export type PowerState = 'ON' | 'OFF' | 'STANDBY';
export type InputSource = 'HDMI1' | 'HDMI2' | 'HDMI3' | 'DISPLAYPORT' | 'USB' | 'TV' | 'PC' | 'AV';
export type ScreenStreamType = 'RTSP' | 'WEBRTC' | 'SCREEN_CAPTURE' | 'SIMULATED' | 'NONE';

export interface DeviceConfig {
  authType?: string;
  authCredentials?: {
    username?: string;
    password?: string;
    token?: string;
    presharedKey?: string;
  };
  customPorts?: {
    telnet?: number;
    pjlink?: number;
  };
}

export interface Device {
  id: string;
  name: string;
  ip: string;
  port: number;
  macAddress?: string;
  brand: string;
  model: string;
  connectionType: ConnectionType;
  location?: string;
  status: DeviceStatus;
  powerState: PowerState;
  volume: number;
  isMuted: boolean;
  brightness: number;
  currentInput: InputSource;
  currentChannel?: string;
  temperature?: number;
  uptimeSeconds?: number;
  lastCommunication?: string;
  streamType: ScreenStreamType;
  streamUrl?: string;
  config?: DeviceConfig;
  createdAt: string;
  updatedAt: string;
}

export type CommandType = 
  | 'POWER_ON'
  | 'POWER_OFF'
  | 'RESTART'
  | 'MUTE'
  | 'UNMUTE'
  | 'TOGGLE_MUTE'
  | 'SET_VOLUME'
  | 'VOLUME_UP'
  | 'VOLUME_DOWN'
  | 'SET_BRIGHTNESS'
  | 'BRIGHTNESS_UP'
  | 'BRIGHTNESS_DOWN'
  | 'SET_INPUT'
  | 'SET_CHANNEL'
  | 'CHANNEL_UP'
  | 'CHANNEL_DOWN'
  | 'KEY_PRESS'
  | 'SEND_TEXT'
  | 'RAW_COMMAND';

export interface CommandResult {
  success: boolean;
  command: CommandType;
  deviceId: string;
  message: string;
  executionTimeMs: number;
  deviceState?: Partial<Device>;
  rawResponse?: any;
}

export interface DiscoveredDevice {
  ip: string;
  macAddress: string;
  hostname?: string;
  manufacturer: string;
  openPorts: number[];
  suggestedConnectionType: ConnectionType;
  suggestedModel?: string;
  responsiveProtocols: string[];
}

export interface AuditLogEntry {
  id: string;
  userId?: string;
  username: string;
  deviceId?: string;
  deviceName?: string;
  action: string;
  details?: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  ipAddress?: string;
  timestamp: string;
}

export interface CommandHistoryEntry {
  id: string;
  userId?: string;
  username: string;
  deviceId: string;
  deviceName: string;
  command: CommandType;
  params?: string;
  resultStatus: 'SUCCESS' | 'FAILED';
  resultMessage: string;
  executionTimeMs: number;
  timestamp: string;
}

export interface TelemetryPoint {
  temperature?: number;
  latency_ms?: number;
  power_state?: string;
  timestamp: string;
}

export interface DashboardStats {
  totalDisplays: number;
  onlineDisplays: number;
  offlineDisplays: number;
  poweredOnDisplays: number;
  averageTemperature: number;
  activeAlerts: number;
  protocolBreakdown: Record<string, number>;
}
