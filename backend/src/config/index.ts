import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database configuration
  DB_TYPE: (process.env.DB_TYPE || 'auto') as 'auto' | 'postgres' | 'sqlite',
  DATABASE_URL: process.env.DATABASE_URL || '',
  POSTGRES: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'controltv',
  },
  SQLITE_PATH: process.env.SQLITE_PATH || path.join(process.cwd(), 'controltv.db'),

  // JWT Security
  JWT_SECRET: process.env.JWT_SECRET || 'controltv-super-secure-jwt-secret-key-change-in-production-98214',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',

  // Device Telemetry & Heartbeat
  HEARTBEAT_INTERVAL_MS: parseInt(process.env.HEARTBEAT_INTERVAL_MS || '15000', 10),
  PING_TIMEOUT_MS: parseInt(process.env.PING_TIMEOUT_MS || '2500', 10),

  // Network Discovery
  SCAN_TIMEOUT_MS: parseInt(process.env.SCAN_TIMEOUT_MS || '8000', 10),
  DEFAULT_SCAN_SUBNET: process.env.DEFAULT_SCAN_SUBNET || '192.168.1.0/24',

  // Built-in Virtual Smart TV Simulator Port
  SIMULATOR_PORT: parseInt(process.env.SIMULATOR_PORT || '9099', 10),
};
