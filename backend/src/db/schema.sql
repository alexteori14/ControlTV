-- ControlTV Industrial Smart TV & Digital Signage Database Schema
-- Compatible with PostgreSQL 12+ and SQLite

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(128) UNIQUE NOT NULL,
    password_hash VARCHAR(256) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'OPERATOR',
    full_name VARCHAR(128) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS devices (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    ip VARCHAR(64) NOT NULL,
    port INTEGER NOT NULL,
    mac_address VARCHAR(32),
    brand VARCHAR(64) NOT NULL,
    model VARCHAR(128) NOT NULL,
    connection_type VARCHAR(32) NOT NULL,
    location VARCHAR(128),
    status VARCHAR(32) NOT NULL DEFAULT 'OFFLINE',
    power_state VARCHAR(32) NOT NULL DEFAULT 'STANDBY',
    volume INTEGER NOT NULL DEFAULT 20,
    is_muted BOOLEAN NOT NULL DEFAULT FALSE,
    brightness INTEGER NOT NULL DEFAULT 80,
    current_input VARCHAR(32) NOT NULL DEFAULT 'HDMI1',
    current_channel VARCHAR(32),
    temperature REAL DEFAULT 34.5,
    uptime_seconds INTEGER DEFAULT 0,
    last_communication TIMESTAMP,
    stream_type VARCHAR(32) NOT NULL DEFAULT 'NONE',
    stream_url TEXT,
    config_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64),
    username VARCHAR(64) NOT NULL,
    device_id VARCHAR(64),
    device_name VARCHAR(128),
    action VARCHAR(64) NOT NULL,
    details TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'SUCCESS',
    ip_address VARCHAR(64),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS command_history (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64),
    username VARCHAR(64) NOT NULL,
    device_id VARCHAR(64) NOT NULL,
    device_name VARCHAR(128) NOT NULL,
    command VARCHAR(64) NOT NULL,
    params TEXT,
    result_status VARCHAR(32) NOT NULL,
    result_message TEXT,
    execution_time_ms INTEGER NOT NULL DEFAULT 0,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS telemetry (
    id VARCHAR(64) PRIMARY KEY,
    device_id VARCHAR(64) NOT NULL,
    temperature REAL,
    power_state VARCHAR(32),
    latency_ms REAL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_devices_ip ON devices(ip);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_command_device ON command_history(device_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_device ON telemetry(device_id, timestamp);
