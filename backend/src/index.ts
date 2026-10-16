import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { CONFIG } from './config/index.js';
import { db } from './db/index.js';
import { SocketManager } from './websocket/SocketManager.js';
import { DeviceManagerService } from './services/DeviceManagerService.js';
import { SimulatedTvServer } from './services/SimulatedTvServer.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import deviceRoutes from './routes/device.routes.js';
import controlRoutes from './routes/control.routes.js';
import discoveryRoutes from './routes/discovery.routes.js';
import auditRoutes from './routes/audit.routes.js';
import telemetryRoutes from './routes/telemetry.routes.js';

const app = express();
const server = http.createServer(app);

// Middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'ControlTV NOC Backend',
    database: db.engine,
    timestamp: new Date().toISOString(),
  });
});

// HTML5 Receiver page for TV browser or secondary screen (Laptop -> TV Mirroring)
app.get('/tv-mirror', (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ControlTV - Receptor de Pantalla</title>
  <script src="/socket.io/socket.io.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, html { width: 100%; height: 100%; background: #050811; color: #fff; font-family: monospace; overflow: hidden; display: flex; align-items: center; justify-content: center; }
    #screen-canvas { width: 100vw; height: 100vh; object-fit: contain; }
    .status-hud { position: absolute; top: 16px; left: 16px; background: rgba(0,0,0,0.75); border: 1px solid #1e293b; padding: 8px 16px; border-radius: 9999px; font-size: 13px; display: flex; align-items: center; gap: 8px; z-index: 10; pointer-events: none; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.85); } }
    .fullscreen-btn { position: absolute; bottom: 16px; right: 16px; background: rgba(15,23,42,0.8); border: 1px solid #334155; color: #38bdf8; padding: 8px 14px; border-radius: 8px; font-size: 12px; cursor: pointer; z-index: 10; font-family: inherit; }
    .fullscreen-btn:hover { background: #1e293b; }
    #waiting-overlay { position: absolute; text-align: center; color: #94a3b8; }
    #waiting-overlay h2 { font-size: 20px; color: #38bdf8; margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="status-hud">
    <div class="dot" id="live-dot"></div>
    <span id="status-text">ESPERANDO TRANSMISIÓN DESDE LAPTOP...</span>
  </div>
  <div id="waiting-overlay">
    <h2>ControlTV NOC - Pantalla Receptora</h2>
    <p>Inicie la transmisión desde la consola de ControlTV para ver la pantalla aquí.</p>
  </div>
  <canvas id="screen-canvas"></canvas>
  <button class="fullscreen-btn" onclick="document.documentElement.requestFullscreen()">Pantalla Completa</button>
  <script>
    const socket = io();
    const urlParams = new URLSearchParams(window.location.search);
    const deviceId = urlParams.get('deviceId') || 'global';
    const canvas = document.getElementById('screen-canvas');
    const ctx = canvas.getContext('2d');
    const statusText = document.getElementById('status-text');
    const waitingOverlay = document.getElementById('waiting-overlay');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.naturalWidth || 1920;
      canvas.height = img.naturalHeight || 1080;
      ctx.drawImage(img, 0, 0);
      waitingOverlay.style.display = 'none';
      statusText.textContent = 'TRANSMITIENDO EN VIVO DESDE LAPTOP';
      statusText.style.color = '#10b981';
    };

    socket.emit('join_stream', deviceId);

    socket.on('screen_frame', (data) => {
      if (data && data.frame) {
        img.src = data.frame;
      }
    });

    socket.on('disconnect', () => {
      statusText.textContent = 'DESCONECTADO DEL SERVIDOR';
      statusText.style.color = '#f43f5e';
    });
  </script>
</body>
</html>`);
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/control', controlRoutes);
app.use('/api/discovery', discoveryRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/telemetry', telemetryRoutes);

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Unhandled Server Error]:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

async function bootstrap() {
  try {
    console.log('====================================================');
    console.log('  ControlTV - Industrial Display Monitoring Center  ');
    console.log('====================================================');

    // 1. Initialize Database (PostgreSQL or SQLite fallback)
    await db.initialize();

    // 2. Initialize WebSocket Hub
    SocketManager.initialize(server);

    // 3. Start Hardware Simulator Socket
    SimulatedTvServer.start();

    // 4. Start Background Heartbeat & Telemetry Monitor
    DeviceManagerService.startHeartbeatMonitor();

    // 5. Start HTTP + WS Server
    server.listen(CONFIG.PORT, () => {
      console.log(`[HTTP Server] Listening on http://localhost:${CONFIG.PORT}`);
      console.log(`[API Ready] Health check at http://localhost:${CONFIG.PORT}/health`);
    });
  } catch (err: any) {
    console.error('[Bootstrap Error] Failed to start ControlTV backend:', err);
    process.exit(1);
  }
}

bootstrap();
