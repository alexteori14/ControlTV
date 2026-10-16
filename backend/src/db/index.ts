import { Pool } from 'pg';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { CONFIG } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseManager {
  private pgPool: Pool | null = null;
  private sqliteDb: Database.Database | null = null;
  public engine: 'postgres' | 'sqlite' = 'sqlite';

  public async initialize(): Promise<void> {
    if (CONFIG.DB_TYPE === 'postgres' || (CONFIG.DB_TYPE === 'auto' && CONFIG.DATABASE_URL)) {
      try {
        console.log('[DB] Attempting PostgreSQL connection...');
        const pool = new Pool(
          CONFIG.DATABASE_URL
            ? { connectionString: CONFIG.DATABASE_URL }
            : {
                host: CONFIG.POSTGRES.host,
                port: CONFIG.POSTGRES.port,
                user: CONFIG.POSTGRES.user,
                password: CONFIG.POSTGRES.password,
                database: CONFIG.POSTGRES.database,
                connectionTimeoutMillis: 3000,
              }
        );

        // Test connection
        const res = await pool.query('SELECT NOW()');
        this.pgPool = pool;
        this.engine = 'postgres';
        console.log(`[DB] Connected to PostgreSQL successfully at ${res.rows[0].now}`);
        await this.runMigrations();
        await this.seedDefaults();
        return;
      } catch (err: any) {
        console.warn(`[DB] PostgreSQL connection failed: ${err.message}. Falling back to SQLite...`);
      }
    }

    // SQLite engine fallback
    console.log(`[DB] Initializing SQLite database at ${CONFIG.SQLITE_PATH}...`);
    this.sqliteDb = new Database(CONFIG.SQLITE_PATH);
    this.sqliteDb.pragma('journal_mode = WAL');
    this.engine = 'sqlite';
    console.log('[DB] Connected to SQLite successfully (PostgreSQL ready)');
    await this.runMigrations();
    await this.seedDefaults();
  }

  public async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (this.engine === 'postgres' && this.pgPool) {
      const res = await this.pgPool.query(sql, params);
      return res.rows as T[];
    } else if (this.sqliteDb) {
      // Convert PostgreSQL style parameters $1, $2 to SQLite ?
      let sqliteSql = sql;
      const convertedSql = sqliteSql.replace(/\$(\d+)/g, '?');
      const isSelect = /^\s*(SELECT|PRAGMA)/i.test(convertedSql);

      const sanitizedParams = params.map((p) => (typeof p === 'boolean' ? (p ? 1 : 0) : p));

      try {
        if (isSelect) {
          const stmt = this.sqliteDb.prepare(convertedSql);
          return stmt.all(...sanitizedParams) as T[];
        } else {
          const stmt = this.sqliteDb.prepare(convertedSql);
          const info = stmt.run(...sanitizedParams);
          return [info as unknown as T];
        }
      } catch (e: any) {
        console.error(`[DB Error] query failed: ${e.message}`, { sql: convertedSql, params });
        throw e;
      }
    }
    throw new Error('Database not initialized');
  }

  public async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  private async runMigrations(): Promise<void> {
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      if (this.sqliteDb) {
        this.sqliteDb.exec(sql);
      } else if (this.pgPool) {
        await this.pgPool.query(sql);
      }
      console.log('[DB] Migrations applied successfully');
    }
  }

  private async seedDefaults(): Promise<void> {
    // Check if admin user exists
    const adminUser = await this.queryOne('SELECT id FROM users WHERE username = $1', ['admin']);
    if (!adminUser) {
      console.log('[DB Seed] Creating default administrative users...');
      const adminPass = await bcrypt.hash('admin123', 10);
      const superPass = await bcrypt.hash('super123', 10);
      const operPass = await bcrypt.hash('oper123', 10);

      await this.query(
        `INSERT INTO users (id, username, email, password_hash, role, full_name, active) VALUES
        ($1, 'admin', 'admin@controltv.lan', $2, 'ADMIN', 'System Administrator', TRUE),
        ($3, 'supervisor', 'supervisor@controltv.lan', $4, 'SUPERVISOR', 'NOC Operations Supervisor', TRUE),
        ($5, 'operator', 'operator@controltv.lan', $6, 'OPERATOR', 'Display Console Operator', TRUE)`,
        [uuidv4(), adminPass, uuidv4(), superPass, uuidv4(), operPass]
      );
      console.log('[DB Seed] Default users created (admin / admin123, supervisor / super123, operator / oper123)');
    }

    // Check if sample devices exist
    const deviceCount = await this.queryOne<{ count: number }>('SELECT count(*) as count FROM devices');
    const count = Number(deviceCount?.count || 0);

    if (count === 0) {
      console.log('[DB Seed] Registering real Samsung Smart TV (10.25.121.140)...');
      const devices = [
        {
          id: uuidv4(),
          name: 'Samsung Smart TV 50" (NOC Monitoreo)',
          ip: '10.25.121.140',
          port: 8001,
          mac: '80:8a:bd:13:28:8a',
          brand: 'Samsung',
          model: 'UN5073CVT403309Z',
          connectionType: 'WEBSOCKET',
          location: 'Sala de Control Principal NOC',
          status: 'ONLINE',
          powerState: 'ON',
          volume: 20,
          isMuted: false,
          brightness: 80,
          currentInput: 'HDMI1',
          temperature: 35.5,
          streamType: 'SIMULATED',
          streamUrl: 'http://10.25.121.140:8001/api/v2/',
          config: JSON.stringify({
            subnetMask: '255.255.255.0',
            gateway: '10.25.121.239',
            dns: '10.25.121.239',
            macAddress: '80:8a:bd:13:28:8a',
            modelCode: 'UN5073CVT403309Z',
            token: '13423728',
            duid: 'uuid:c636c6ba-c590-48f3-b6ce-45494333ce34',
            authCredentials: {
              token: '13423728',
            },
            testedPorts: {
              '80': { open: false, service: 'HTTP' },
              '443': { open: false, service: 'HTTPS' },
              '22': { open: false, service: 'SSH' },
              '161': { open: false, service: 'SNMP' },
              '1900': { open: true, service: 'SSDP / UPnP' },
              '8001': { open: true, service: 'Samsung Tizen REST API' },
              '8002': { open: true, service: 'Samsung Smart Remote WSS' },
              '4352': { open: false, service: 'PJLink' },
            },
            customPorts: {
              http: 80,
              https: 443,
              ssh: 22,
              snmp: 161,
              ssdp: 1900,
              tizenRest: 8001,
              tizenWss: 8002,
              pjlink: 4352,
            },
          }),
        },
      ];

      for (const d of devices) {
        await this.query(
          `INSERT INTO devices (
            id, name, ip, port, mac_address, brand, model, connection_type,
            location, status, power_state, volume, is_muted, brightness,
            current_input, temperature, uptime_seconds, stream_type, stream_url,
            config_json, last_communication
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13, $14,
            $15, $16, 7200, $17, $18,
            $19, CURRENT_TIMESTAMP
          )`,
          [
            d.id,
            d.name,
            d.ip,
            d.port,
            d.mac,
            d.brand,
            d.model,
            d.connectionType,
            d.location,
            d.status,
            d.powerState,
            d.volume,
            d.isMuted,
            d.brightness,
            d.currentInput,
            d.temperature,
            d.streamType,
            d.streamUrl,
            d.config,
          ]
        );
      }
      console.log(`[DB Seed] Seeded ${devices.length} real Samsung display successfully`);
    }
  }
}

export const db = new DatabaseManager();
