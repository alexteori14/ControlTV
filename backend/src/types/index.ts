export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'OPERATOR';

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash?: string;
  role: UserRole;
  fullName: string;
  active: boolean;
  createdAt: string;
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
  authType?: 'none' | 'basic' | 'bearer' | 'psk' | 'pjlink_password';
  authCredentials?: {
    username?: string;
    password?: string;
    token?: string;
    presharedKey?: string;
  };
  snmpCommunity?: string;
  snmpVersion?: '1' | '2c';
  customPorts?: {
    telnet?: number;
    pjlink?: number;
    stream?: number;
  };
  interimPcIp?: string;
  hdmiCaptureDeviceName?: string;
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
  volume: number; // 0-100
  isMuted: boolean;
  brightness: number; // 0-100
  currentInput: InputSource;
  currentChannel?: string;
  temperature?: number; // In Celsius
  uptimeSeconds?: number;
  lastCommunication?: string;
  streamType: ScreenStreamType;
  streamUrl?: string;
  config: DeviceConfig;
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

export interface CommandRequest {
  deviceId: string;
  command: CommandType;
  payload?: any;
}

export interface CommandResult {
  success: boolean;
  command: CommandType;
  deviceId: string;
  message: string;
  deviceState?: Partial<Device>;
  executionTimeMs: number;
  rawResponse?: any;
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

export interface DiscoveredDevice {
  ip: string;
  macAddress: string;
  hostname?: string;
  manufacturer: string;
  openPorts: number[];
  suggestedConnectionType: ConnectionType;
  suggestedModel?: string;
  responsiveProtocols: string[];
  ttl?: number;
}

export interface TelemetryRecord {
  id?: string;
  deviceId: string;
  temperature?: number;
  powerState: PowerState;
  latencyMs: number;
  timestamp: string;
}
