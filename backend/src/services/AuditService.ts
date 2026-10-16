import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/index.js';
import { AuditLogEntry, CommandHistoryEntry, CommandType } from '../types/index.js';

export class AuditService {
  public static async logAction(params: {
    userId?: string;
    username: string;
    deviceId?: string;
    deviceName?: string;
    action: string;
    details?: string;
    status: 'SUCCESS' | 'FAILED' | 'PENDING';
    ipAddress?: string;
  }): Promise<AuditLogEntry> {
    const entry: AuditLogEntry = {
      id: uuidv4(),
      userId: params.userId,
      username: params.username,
      deviceId: params.deviceId,
      deviceName: params.deviceName,
      action: params.action,
      details: params.details,
      status: params.status,
      ipAddress: params.ipAddress,
      timestamp: new Date().toISOString(),
    };

    try {
      await db.query(
        `INSERT INTO audit_logs (id, user_id, username, device_id, device_name, action, details, status, ip_address, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
        [
          entry.id,
          entry.userId,
          entry.username,
          entry.deviceId,
          entry.deviceName,
          entry.action,
          entry.details,
          entry.status,
          entry.ipAddress,
        ]
      );
    } catch (e: any) {
      console.error('[AuditService] Failed to insert audit log:', e.message);
    }

    return entry;
  }

  public static async logCommand(params: {
    userId?: string;
    username: string;
    deviceId: string;
    deviceName: string;
    command: CommandType;
    params?: any;
    resultStatus: 'SUCCESS' | 'FAILED';
    resultMessage: string;
    executionTimeMs: number;
  }): Promise<CommandHistoryEntry> {
    const entry: CommandHistoryEntry = {
      id: uuidv4(),
      userId: params.userId,
      username: params.username,
      deviceId: params.deviceId,
      deviceName: params.deviceName,
      command: params.command,
      params: params.params ? JSON.stringify(params.params) : undefined,
      resultStatus: params.resultStatus,
      resultMessage: params.resultMessage,
      executionTimeMs: params.executionTimeMs,
      timestamp: new Date().toISOString(),
    };

    try {
      await db.query(
        `INSERT INTO command_history (id, user_id, username, device_id, device_name, command, params, result_status, result_message, execution_time_ms, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)`,
        [
          entry.id,
          entry.userId,
          entry.username,
          entry.deviceId,
          entry.deviceName,
          entry.command,
          entry.params,
          entry.resultStatus,
          entry.resultMessage,
          entry.executionTimeMs,
        ]
      );
    } catch (e: any) {
      console.error('[AuditService] Failed to record command history:', e.message);
    }

    return entry;
  }

  public static async getAuditLogs(limit = 100, offset = 0, filter?: { deviceId?: string; action?: string }): Promise<AuditLogEntry[]> {
    let sql = 'SELECT * FROM audit_logs';
    const params: any[] = [];
    const conditions: string[] = [];

    if (filter?.deviceId) {
      params.push(filter.deviceId);
      conditions.push(`device_id = $${params.length}`);
    }
    if (filter?.action) {
      params.push(`%${filter.action}%`);
      conditions.push(`action LIKE $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ` ORDER BY timestamp DESC LIMIT ${limit} OFFSET ${offset}`;
    const rows = await db.query(sql, params);

    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      username: r.username,
      deviceId: r.device_id,
      deviceName: r.device_name,
      action: r.action,
      details: r.details,
      status: r.status,
      ipAddress: r.ip_address,
      timestamp: r.timestamp,
    }));
  }

  public static async getCommandHistory(deviceId?: string, limit = 50): Promise<CommandHistoryEntry[]> {
    let sql = 'SELECT * FROM command_history';
    const params: any[] = [];

    if (deviceId) {
      params.push(deviceId);
      sql += ' WHERE device_id = $1';
    }

    sql += ` ORDER BY timestamp DESC LIMIT ${limit}`;
    const rows = await db.query(sql, params);

    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      username: r.username,
      deviceId: r.device_id,
      deviceName: r.device_name,
      command: r.command,
      params: r.params,
      resultStatus: r.result_status,
      resultMessage: r.result_message,
      executionTimeMs: r.execution_time_ms,
      timestamp: r.timestamp,
    }));
  }
}
