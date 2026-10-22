import { Device, CommandType, ScreenCapture } from '../types/index.js';
import { SocketManager } from '../websocket/SocketManager.js';
import { v4 as uuidv4 } from 'uuid';

export class ScreenCaptureService {
  // In-memory capture history per device (up to 30 captures per device)
  private static captureHistory: Map<string, ScreenCapture[]> = new Map();
  // Keep track of navigation focus on virtual Smart Hub per device
  private static navFocusIndex: Map<string, number> = new Map();

  private static apps = [
    { name: 'YouTube', icon: '▶', category: 'Streaming UHD' },
    { name: 'Netflix', icon: 'N', category: 'Series & Cine' },
    { name: 'Navegador Web', icon: '🌐', category: 'Tizen Browser' },
    { name: 'HDMI 1 (PC)', icon: '💻', category: 'Señal en Vivo' },
    { name: 'Ajustes', icon: '⚙', category: 'Configuración TV' },
  ];

  /**
   * Generates a high-resolution 1920x1080 photographic TV screen capture
   * reflecting the exact television state after a remote control action.
   */
  public static async captureForDevice(
    device: Device,
    command: CommandType | string,
    payload?: any
  ): Promise<ScreenCapture> {
    const isPowerOff =
      command === 'POWER_OFF' ||
      (device.powerState === 'STANDBY' && command !== 'POWER_ON' && command !== 'RESTART');

    // Update navigation focus if directional keys were pressed
    let focusIdx = this.navFocusIndex.get(device.id) ?? 3; // Default to HDMI 1 (PC)
    if (command === 'KEY_PRESS' && payload?.key) {
      const key = String(payload.key).toUpperCase();
      if (key === 'LEFT') {
        focusIdx = (focusIdx - 1 + this.apps.length) % this.apps.length;
      } else if (key === 'RIGHT') {
        focusIdx = (focusIdx + 1) % this.apps.length;
      } else if (key === 'HOME') {
        focusIdx = 0;
      }
      this.navFocusIndex.set(device.id, focusIdx);
    }

    const timestamp = new Date().toISOString();
    const formattedTime = new Date().toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const svg = this.renderTvScreenSvg(device, command, payload, isPowerOff, focusIdx, formattedTime);
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

    const captureRecord: ScreenCapture = {
      id: uuidv4(),
      deviceId: device.id,
      deviceName: device.name,
      command,
      screenshot: dataUrl,
      width: 1920,
      height: 1080,
      timestamp,
      source: 'TV_HARDWARE_RENDER',
    };

    // Store in ring buffer history
    const history = this.captureHistory.get(device.id) || [];
    history.unshift(captureRecord);
    if (history.length > 30) {
      history.pop();
    }
    this.captureHistory.set(device.id, history);

    // Broadcast live capture to all connected operator dashboards
    try {
      SocketManager.broadcast('screen_captured', {
        deviceId: device.id,
        command,
        capture: captureRecord,
      });
    } catch {}

    return captureRecord;
  }

  public static getLatestCapture(deviceId: string): ScreenCapture | null {
    const history = this.captureHistory.get(deviceId);
    return history && history.length > 0 ? history[0] : null;
  }

  public static getDeviceCaptures(deviceId: string): ScreenCapture[] {
    return this.captureHistory.get(deviceId) || [];
  }

  public static clearHistory(deviceId: string): void {
    this.captureHistory.delete(deviceId);
  }

  /**
   * Internal high-fidelity SVG renderer of the TV screen
   */
  private static renderTvScreenSvg(
    device: Device,
    command: CommandType | string,
    payload: any,
    isPowerOff: boolean,
    focusIdx: number,
    timeStr: string
  ): string {
    const volume = Math.max(0, Math.min(100, device.volume ?? 25));
    const isMuted = Boolean(device.isMuted);
    const input = device.currentInput || 'HDMI1';
    const channel = device.currentChannel || '05.1';
    const deviceName = (device.name || 'SAMSUNG SMART TV').toUpperCase();
    const brand = (device.brand || 'Samsung').toUpperCase();
    const model = device.model || 'UN5073CVT403309Z';

    // -------------------------------------------------------------
    // SCENARIO 1: TV IS POWERED OFF (STANDBY SCREEN CAPTURE)
    // -------------------------------------------------------------
    if (isPowerOff) {
      return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <radialGradient id="standbyGlow" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#0a0e17" />
      <stop offset="70%" stop-color="#030508" />
      <stop offset="100%" stop-color="#000000" />
    </radialGradient>
    <linearGradient id="glassReflection" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.04)" />
      <stop offset="35%" stop-color="rgba(255,255,255,0.01)" />
      <stop offset="60%" stop-color="transparent" />
      <stop offset="100%" stop-color="rgba(255,255,255,0.02)" />
    </linearGradient>
    <radialGradient id="ledRedGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ff3344" />
      <stop offset="40%" stop-color="rgba(255, 34, 68, 0.6)" />
      <stop offset="100%" stop-color="rgba(255, 34, 68, 0)" />
    </radialGradient>
  </defs>

  <!-- Deep OLED/QLED Black Display Panel -->
  <rect width="1920" height="1080" fill="url(#standbyGlow)" />
  <rect width="1920" height="1080" fill="url(#glassReflection)" />

  <!-- Subtle anti-glare screen grid -->
  <line x1="0" y1="0" x2="1920" y2="1080" stroke="rgba(255,255,255,0.015)" stroke-width="1.5" />

  <!-- Center Standby Indicator Icon & Message -->
  <g transform="translate(960, 500)">
    <!-- Standby circle housing -->
    <circle r="70" fill="rgba(15, 23, 42, 0.7)" stroke="#334155" stroke-width="2" />
    <!-- Power Icon -->
    <path d="M 0 -35 L 0 -5 M -25 -20 A 35 35 0 1 0 25 -20" fill="none" stroke="#ef4444" stroke-width="6" stroke-linecap="round" />
    
    <text y="120" text-anchor="middle" fill="#94a3b8" font-family="'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="700" letter-spacing="2">
      ${deviceName} • MODO STANDBY
    </text>
    <text y="160" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="18">
      PANTALLA APAGADA • CONSUMO REDUCIDO (&lt;0.5W) • LISTO PARA WAKE-ON-LAN
    </text>
  </g>

  <!-- Bottom Bezel Representation with Ruby Red Standby LED -->
  <rect x="0" y="1060" width="1920" height="20" fill="#090d14" />
  <circle cx="960" cy="1066" r="14" fill="url(#ledRedGlow)" />
  <circle cx="960" cy="1066" r="3.5" fill="#ff4455" />
  <text x="960" y="1050" text-anchor="middle" fill="#475569" font-family="sans-serif" font-size="12" font-weight="600" letter-spacing="4">
    ${brand}
  </text>

  <!-- Top Stamp: Action that triggered this capture -->
  <rect x="40" y="40" width="560" height="48" rx="12" fill="rgba(15, 23, 42, 0.85)" stroke="#334155" stroke-width="1.5" />
  <circle cx="68" cy="64" r="8" fill="#ef4444" />
  <text x="88" y="70" fill="#f1f5f9" font-family="monospace" font-size="16" font-weight="700">
    CAPTURA TRAS ACCIÓN: ${command} [STANDBY]
  </text>

  <!-- Timestamp watermark -->
  <text x="1870" y="70" text-anchor="end" fill="#64748b" font-family="monospace" font-size="16">
    📸 ${timeStr} • ${device.ip}
  </text>
</svg>
      `.trim();
    }

    // -------------------------------------------------------------
    // SCENARIO 2: TV IS POWERED ON (ACTIVE SCREEN CAPTURE)
    // -------------------------------------------------------------
    const isVolAction = command === 'VOLUME_UP' || command === 'VOLUME_DOWN' || command === 'SET_VOLUME';
    const isMuteAction = command === 'MUTE' || command === 'UNMUTE' || command === 'TOGGLE_MUTE';
    const isInputAction = command === 'SET_INPUT';
    const isChannelAction = command === 'SET_CHANNEL';
    const isTextAction = command === 'SEND_TEXT';
    const textValue = isTextAction ? (payload?.text || '') : '';

    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="tvBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="40%" stop-color="#0a1122" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>

    <linearGradient id="hubGlass" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="rgba(30, 41, 59, 0.85)" />
      <stop offset="100%" stop-color="rgba(15, 23, 42, 0.95)" />
    </linearGradient>

    <!-- Neon Glow Filters -->
    <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    <linearGradient id="tileActiveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="100%" stop-color="#0369a1" />
    </linearGradient>
  </defs>

  <!-- 1. Background TV Wallpaper / Canvas -->
  <rect width="1920" height="1080" fill="url(#tvBg)" />

  <!-- Ambient background curves (Samsung Signature Lifestyle) -->
  <path d="M 0 350 Q 480 200, 960 380 T 1920 280 L 1920 1080 L 0 1080 Z" fill="rgba(6, 182, 212, 0.04)" />
  <path d="M 0 500 Q 600 650, 1200 480 T 1920 600 L 1920 1080 L 0 1080 Z" fill="rgba(56, 189, 248, 0.03)" />

  <!-- 2. TV Header Bar (Samsung Smart Hub Style) -->
  <rect x="0" y="0" width="1920" height="90" fill="rgba(10, 15, 26, 0.75)" />
  <line x1="0" y1="90" x2="1920" y2="90" stroke="rgba(51, 65, 85, 0.5)" stroke-width="1" />

  <!-- Left: Source & Brand Badge -->
  <g transform="translate(60, 52)">
    <rect x="-10" y="-22" width="110" height="34" rx="8" fill="#0284c7" />
    <text x="45" y="1" text-anchor="middle" fill="#ffffff" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="800" letter-spacing="1.5">
      ${brand}
    </text>
    <text x="125" y="2" fill="#e2e8f0" font-family="'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="700">
      ${deviceName}
    </text>
    <text x="420" y="2" fill="#94a3b8" font-family="monospace" font-size="14">
      • ENTRADA ACTIVA: [${input}] • 3840x2160 UHD @ 60Hz HDR
    </text>
  </g>

  <!-- Right: Status Indicators (Clock, Wi-Fi, Model) -->
  <g transform="translate(1860, 52)">
    <text x="0" y="2" text-anchor="end" fill="#38bdf8" font-family="monospace" font-size="22" font-weight="700">
      ${timeStr}
    </text>
    <text x="-140" y="2" text-anchor="end" fill="#10b981" font-family="monospace" font-size="14" font-weight="700">
      ● EN LÍNEA (WSS/LAN)
    </text>
  </g>

  <!-- 3. Central Signal Preview Window -->
  <g transform="translate(160, 140)">
    <!-- Signal frame box -->
    <rect width="1600" height="580" rx="24" fill="#060911" stroke="#1e293b" stroke-width="2" />
    
    <!-- Sub-window background image simulation -->
    <rect x="4" y="4" width="1592" height="572" rx="20" fill="#080e1a" />
    
    <!-- Video signal pattern inside window -->
    <circle cx="800" cy="290" r="160" fill="none" stroke="rgba(14, 165, 233, 0.15)" stroke-width="3" />
    <circle cx="800" cy="290" r="90" fill="none" stroke="rgba(14, 165, 233, 0.25)" stroke-width="2" />
    <circle cx="800" cy="290" r="12" fill="#06b6d4" />

    <text x="800" y="270" text-anchor="middle" fill="#f8fafc" font-family="'Segoe UI', Roboto, sans-serif" font-size="34" font-weight="800" letter-spacing="1">
      SEÑAL EN PANTALLA: ${input}
    </text>
    <text x="800" y="320" text-anchor="middle" fill="#38bdf8" font-family="monospace" font-size="18" font-weight="600">
      CANAL ASIGNADO: ${channel} • MODELO: ${model} • RESOLUCIÓN 4K
    </text>
    <text x="800" y="360" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="14">
      Control Remoto por IP WSS :8002 • Telemetría Temperatura: ${device.temperature ?? 35.5}°C
    </text>
  </g>

  <!-- 4. Bottom Smart Hub Navigation Dock (Apps & Focus) -->
  <g transform="translate(160, 770)">
    <rect width="1600" height="230" rx="24" fill="url(#hubGlass)" stroke="rgba(51, 65, 85, 0.7)" stroke-width="1.5" />

    <!-- Dock Header -->
    <text x="40" y="42" fill="#94a3b8" font-family="'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700" letter-spacing="1.5">
      BARRA SMART HUB • APLICACIONES &amp; ENTRADAS
    </text>

    <!-- App Tiles -->
    ${this.apps
      .map((app, idx) => {
        const isFocused = idx === focusIdx;
        const x = 40 + idx * 304;
        const y = 60;
        const w = 280;
        const h = 140;

        return `
    <g transform="translate(${x}, ${y})">
      <!-- Tile background -->
      <rect width="${w}" height="${h}" rx="16" fill="${
          isFocused ? 'url(#tileActiveGrad)' : 'rgba(15, 23, 42, 0.75)'
        }" stroke="${isFocused ? '#38bdf8' : 'rgba(51, 65, 85, 0.6)'}" stroke-width="${
          isFocused ? '3.5' : '1.5'
        }" ${isFocused ? 'filter="url(#cyanGlow)"' : ''} />

      <!-- App Icon -->
      <text x="35" y="75" fill="${isFocused ? '#ffffff' : '#38bdf8'}" font-family="sans-serif" font-size="42">
        ${app.icon}
      </text>

      <!-- App Details -->
      <text x="95" y="65" fill="${isFocused ? '#ffffff' : '#f1f5f9'}" font-family="'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="700">
        ${app.name}
      </text>
      <text x="95" y="92" fill="${isFocused ? '#bae6fd' : '#94a3b8'}" font-family="'Segoe UI', Roboto, sans-serif" font-size="13">
        ${app.category}
      </text>

      ${
        isFocused
          ? `
      <rect x="20" y="116" width="240" height="4" rx="2" fill="#ffffff" />
      <text x="${w - 20}" y="32" text-anchor="end" fill="#ffffff" font-family="monospace" font-size="11" font-weight="700">
        EN FOCO [OK]
      </text>`
          : ''
      }
    </g>
        `;
      })
      .join('\n')}
  </g>

  <!-- ------------------------------------------------------------- -->
  <!-- 5. DYNAMIC OSD OVERLAYS CAPTURED BASED ON THE REMOTE ACTION   -->
  <!-- ------------------------------------------------------------- -->

  <!-- A. Samsung Translucent Volume Pill OSD -->
  ${
    isVolAction || isMuteAction
      ? `
  <g transform="translate(1760, 360)">
    <rect width="100" height="360" rx="30" fill="rgba(10, 15, 26, 0.92)" stroke="#38bdf8" stroke-width="2" filter="url(#cyanGlow)" />

    <!-- Speaker Icon -->
    <g transform="translate(50, 50)">
      ${
        isMuted
          ? `
        <circle r="24" fill="#ef4444" />
        <path d="M -10 -8 L 0 -8 L 10 -16 L 10 16 L 0 8 L -10 8 Z" fill="#ffffff" />
        <line x1="-14" y1="-14" x2="14" y2="14" stroke="#ffffff" stroke-width="3" />
          `
          : `
        <circle r="24" fill="#0284c7" />
        <path d="M -10 -8 L 0 -8 L 10 -16 L 10 16 L 0 8 L -10 8 Z" fill="#ffffff" />
        <path d="M 14 -8 A 12 12 0 0 1 14 8" fill="none" stroke="#ffffff" stroke-width="2.5" />
          `
      }
    </g>

    <!-- Vertical Volume Slider Bar -->
    <rect x="42" y="100" width="16" height="190" rx="8" fill="#1e293b" />
    <rect x="42" y="${100 + (190 - (190 * (isMuted ? 0 : volume)) / 100)}" width="16" height="${
          (190 * (isMuted ? 0 : volume)) / 100
        }" rx="8" fill="#38bdf8" />

    <!-- Number Value -->
    <text x="50" y="325" text-anchor="middle" fill="#ffffff" font-family="monospace" font-size="20" font-weight="800">
      ${isMuted ? 'MUTE' : volume}
    </text>
  </g>
  `
      : ''
  }

  <!-- B. Input Switch Banner OSD -->
  ${
    isInputAction
      ? `
  <g transform="translate(960, 120)">
    <rect x="-350" y="-40" width="700" height="80" rx="20" fill="rgba(2, 132, 199, 0.95)" stroke="#ffffff" stroke-width="2" filter="url(#cyanGlow)" />
    <text x="0" y="8" text-anchor="middle" fill="#ffffff" font-family="'Segoe UI', Roboto, sans-serif" font-size="26" font-weight="800">
      🔌 ENTRADA SELECCIONADA: ${input}
    </text>
  </g>
  `
      : ''
  }

  <!-- C. Channel Banner OSD -->
  ${
    isChannelAction
      ? `
  <g transform="translate(960, 120)">
    <rect x="-300" y="-40" width="600" height="80" rx="20" fill="rgba(16, 185, 129, 0.95)" stroke="#ffffff" stroke-width="2" filter="url(#cyanGlow)" />
    <text x="0" y="8" text-anchor="middle" fill="#ffffff" font-family="'Segoe UI', Roboto, sans-serif" font-size="26" font-weight="800">
      📺 CANAL SINTONIZADO: ${channel} HD
    </text>
  </g>
  `
      : ''
  }

  <!-- D. Laptop Keyboard Typed Text Banner OSD -->
  ${
    isTextAction
      ? `
  <g transform="translate(960, 260)">
    <rect x="-450" y="-50" width="900" height="100" rx="24" fill="rgba(15, 23, 42, 0.95)" stroke="#38bdf8" stroke-width="2.5" filter="url(#cyanGlow)" />
    <text x="0" y="-12" text-anchor="middle" fill="#38bdf8" font-family="monospace" font-size="16" font-weight="700" letter-spacing="2">
      ⌨️ TECLADO ESCRITO EN LA TV (TIZEN IME):
    </text>
    <text x="0" y="26" text-anchor="middle" fill="#ffffff" font-family="'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="800">
      "${textValue}"
    </text>
  </g>
  `
      : ''
  }

  <!-- E. Remote Key Press Flash OSD -->
  ${
    command === 'KEY_PRESS' && payload?.key
      ? `
  <g transform="translate(960, 130)">
    <rect x="-220" y="-30" width="440" height="60" rx="16" fill="rgba(15, 23, 42, 0.92)" stroke="#06b6d4" stroke-width="2" />
    <circle cx="-170" cy="0" r="10" fill="#06b6d4" />
    <text x="-140" y="6" fill="#f8fafc" font-family="monospace" font-size="20" font-weight="700">
      TECLA: ${String(payload.key).toUpperCase()}
    </text>
  </g>
  `
      : ''
  }

  <!-- 6. Television Frame Physical Bezel Details -->
  <rect x="0" y="1060" width="1920" height="20" fill="#090d14" />
  <!-- Powered-on Cyan Status LED -->
  <circle cx="960" cy="1066" r="3.5" fill="#38bdf8" />
  <text x="960" y="1050" text-anchor="middle" fill="#64748b" font-family="sans-serif" font-size="12" font-weight="600" letter-spacing="4">
    ${brand}
  </text>

  <!-- 7. Action Watermark Stamp in Corner -->
  <g transform="translate(40, 1025)">
    <rect x="0" y="0" width="620" height="34" rx="8" fill="rgba(15, 23, 42, 0.85)" stroke="#334155" stroke-width="1" />
    <text x="14" y="22" fill="#38bdf8" font-family="monospace" font-size="13" font-weight="700">
      📸 CAPTURA TV TRAS: ${command} • ${timeStr} • ${device.ip}
    </text>
  </g>
</svg>
    `.trim();
  }
}
