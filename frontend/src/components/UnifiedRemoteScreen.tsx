import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDevices } from '../context/DeviceContext.js';
import { Device, CommandType } from '../types/index.js';
import {
  Power,
  RotateCcw,
  Volume2,
  VolumeX,
  Volume1,
  Tv,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Home,
  Menu,
  CornerDownLeft,
  Wifi,
  Maximize,
  Minimize,
  Camera,
  Square,
  Video,
  Monitor,
  Info,
  Send,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Keyboard,
  X,
} from 'lucide-react';

interface UnifiedRemoteScreenProps {
  initialDevice?: Device | null;
}

export const UnifiedRemoteScreen: React.FC<UnifiedRemoteScreenProps> = ({ initialDevice }) => {
  const { devices, executeCommand, pingDevice, lastCommandResult } = useDevices();

  // Selected TV state
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(
    initialDevice || (devices.length > 0 ? devices[0] : null)
  );

  // Keep selected device synced with global devices updates
  useEffect(() => {
    if (initialDevice) {
      const match = devices.find((d) => d.id === initialDevice.id);
      setSelectedDevice(match || initialDevice);
    } else if (devices.length > 0 && !selectedDevice) {
      setSelectedDevice(devices[0]);
    } else if (selectedDevice) {
      const match = devices.find((d) => d.id === selectedDevice.id);
      if (match) setSelectedDevice(match);
    }
  }, [initialDevice, devices]);

  // Remote Control States
  const [volume, setVolume] = useState<number>(selectedDevice?.volume ?? 25);
  const [isExecuting, setIsExecuting] = useState(false);
  const [pingLatency, setPingLatency] = useState<number | null>(null);

  // Sync sliders when device updates
  useEffect(() => {
    if (selectedDevice) {
      setVolume(selectedDevice.volume ?? 25);
    }
  }, [selectedDevice?.id, selectedDevice?.volume]);

  // Video Streaming States (ONLY TV -> Laptop)
  const [streamMode, setStreamMode] = useState<'DIGITAL_TWIN' | 'HDMI_CAPTURE' | 'SCREEN_CAPTURE'>('DIGITAL_TWIN');
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);

  // Laptop Keyboard Writing States (Clean bar without search shortcuts)
  const [typedText, setTypedText] = useState('');
  const [isKeyboardPassthrough, setIsKeyboardPassthrough] = useState(false);
  const [lastSentText, setLastSentText] = useState<string | null>(null);

  // Smart TV Navigation Focus (Where you are looking on screen)
  const [focusedAppIndex, setFocusedAppIndex] = useState<number>(0);
  const tvApps = [
    { id: 'youtube', name: 'YouTube', icon: '▶', category: 'Video Stream' },
    { id: 'netflix', name: 'Netflix', icon: 'N', category: 'Películas & Series' },
    { id: 'browser', name: 'Navegador Web', icon: '🌐', category: 'Internet / URLs' },
    { id: 'hdmi1', name: 'HDMI 1 (PC)', icon: '📺', category: 'Señal en Vivo' },
    { id: 'settings', name: 'Ajustes TV', icon: '⚙', category: 'Configuración' },
  ];

  // Real-Time Reactive Samsung OSD Overlays
  const [osdVolume, setOsdVolume] = useState<{ show: boolean; level: number; muted: boolean }>({
    show: false,
    level: selectedDevice?.volume ?? 25,
    muted: selectedDevice?.isMuted ?? false,
  });
  const [osdKey, setOsdKey] = useState<{ show: boolean; keyName: string }>({
    show: false,
    keyName: '',
  });
  const [osdText, setOsdText] = useState<{ show: boolean; text: string }>({
    show: false,
    text: '',
  });

  // Timers for OSD fade-out
  const osdVolumeTimerRef = useRef<number | null>(null);
  const osdKeyTimerRef = useRef<number | null>(null);
  const osdTextTimerRef = useRef<number | null>(null);

  // Video & Canvas Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tvContainerRef = useRef<HTMLDivElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const keyboardInputRef = useRef<HTMLInputElement | null>(null);

  const isPowerOn = selectedDevice?.powerState === 'ON';

  // Tactile sound click synthesizer (Web Audio API)
  const playTactileBeep = useCallback((freq = 850, duration = 0.04) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio autoplay restrictions
    }
  }, []);

  // Trigger Samsung TV OSD notifications
  const triggerOsdVolume = useCallback((newVol: number, isMuted: boolean) => {
    if (osdVolumeTimerRef.current) clearTimeout(osdVolumeTimerRef.current);
    setOsdVolume({ show: true, level: newVol, muted: isMuted });
    osdVolumeTimerRef.current = window.setTimeout(() => {
      setOsdVolume((prev) => ({ ...prev, show: false }));
    }, 2800);
  }, []);

  const triggerOsdKey = useCallback((keyName: string) => {
    if (osdKeyTimerRef.current) clearTimeout(osdKeyTimerRef.current);
    setOsdKey({ show: true, keyName });
    osdKeyTimerRef.current = window.setTimeout(() => {
      setOsdKey((prev) => ({ ...prev, show: false }));
    }, 1800);
  }, []);

  const triggerOsdText = useCallback((text: string) => {
    if (osdTextTimerRef.current) clearTimeout(osdTextTimerRef.current);
    setOsdText({ show: true, text });
    osdTextTimerRef.current = window.setTimeout(() => {
      setOsdText((prev) => ({ ...prev, show: false }));
    }, 3800);
  }, []);

  // Dispatch text from laptop keyboard to the TV (Samsung Tizen IME)
  const handleSendText = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : typedText).trim();
    if (!text || !selectedDevice) return;

    playTactileBeep(950, 0.05);
    setIsExecuting(true);
    setLastSentText(text);
    triggerOsdText(text);

    await executeCommand(selectedDevice.id, 'SEND_TEXT', { text });
    setIsExecuting(false);
    if (textToSend === undefined) {
      setTypedText('');
    }
  };

  // Real-time Laptop Keyboard Listener (Passthrough mode)
  useEffect(() => {
    if (!isKeyboardPassthrough || !selectedDevice) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleCommand('KEY_PRESS', { key: 'UP' });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleCommand('KEY_PRESS', { key: 'DOWN' });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setFocusedAppIndex((prev) => (prev > 0 ? prev - 1 : tvApps.length - 1));
        handleCommand('KEY_PRESS', { key: 'LEFT' });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setFocusedAppIndex((prev) => (prev < tvApps.length - 1 ? prev + 1 : 0));
        handleCommand('KEY_PRESS', { key: 'RIGHT' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleCommand('KEY_PRESS', { key: 'ENTER' });
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleCommand('KEY_PRESS', { key: 'BACK' });
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCommand('KEY_PRESS', { key: 'BACK' });
      } else if (e.key === 'Home') {
        e.preventDefault();
        handleCommand('KEY_PRESS', { key: 'HOME' });
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        handleSendText(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isKeyboardPassthrough, selectedDevice, focusedAppIndex]);

  // Execute remote commands and trigger corresponding TV Screen OSD
  const handleCommand = async (command: CommandType, payload?: any) => {
    if (!selectedDevice) return;
    playTactileBeep();
    setIsExecuting(true);

    if (command === 'VOLUME_UP') {
      const next = Math.min(100, (selectedDevice.volume ?? 25) + 1);
      setVolume(next);
      triggerOsdVolume(next, false);
    } else if (command === 'VOLUME_DOWN') {
      const next = Math.max(0, (selectedDevice.volume ?? 25) - 1);
      setVolume(next);
      triggerOsdVolume(next, false);
    } else if (command === 'SET_VOLUME') {
      triggerOsdVolume(payload.volume, false);
    } else if (command === 'TOGGLE_MUTE' || command === 'MUTE') {
      triggerOsdVolume(volume, !selectedDevice.isMuted);
    } else if (command === 'KEY_PRESS') {
      if (payload.key === 'LEFT') {
        setFocusedAppIndex((prev) => (prev > 0 ? prev - 1 : tvApps.length - 1));
      } else if (payload.key === 'RIGHT') {
        setFocusedAppIndex((prev) => (prev < tvApps.length - 1 ? prev + 1 : 0));
      }

      const keyLabelMap: Record<string, string> = {
        UP: '▲ Arriba',
        DOWN: '▼ Abajo',
        LEFT: '◄ Izquierda',
        RIGHT: '► Derecha',
        ENTER: `✓ OK: ${tvApps[focusedAppIndex]?.name || 'Aceptar'}`,
        OK: `✓ OK: ${tvApps[focusedAppIndex]?.name || 'Aceptar'}`,
        HOME: '🏠 Inicio Smart Hub',
        MENU: '☰ Menú de Ajustes',
        BACK: '↩ Volver',
        KEY_INFO: 'ℹ Info de Señal',
      };
      triggerOsdKey(keyLabelMap[payload.key] || `Tecla: ${payload.key}`);
    }

    await executeCommand(selectedDevice.id, command, payload);
    setIsExecuting(false);
  };

  const handlePing = async () => {
    if (!selectedDevice) return;
    playTactileBeep(1200, 0.03);
    const startTime = Date.now();
    const ok = await pingDevice(selectedDevice.id);
    setPingLatency(ok ? Date.now() - startTime : null);
  };

  // Enumerate USB video capture devices
  useEffect(() => {
    const listDevices = async () => {
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');
        setVideoDevices(videoInputs);
        if (videoInputs.length > 0 && !selectedVideoDeviceId) {
          const captureCard = videoInputs.find(
            (d) =>
              d.label.toLowerCase().includes('capture') ||
              d.label.toLowerCase().includes('cam') ||
              d.label.toLowerCase().includes('usb')
          );
          setSelectedVideoDeviceId(captureCard ? captureCard.deviceId : videoInputs[0].deviceId);
        }
      } catch (err) {
        console.warn('Could not enumerate video devices:', err);
      }
    };

    listDevices();
    navigator.mediaDevices.addEventListener('devicechange', listDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', listDevices);
    };
  }, [selectedVideoDeviceId]);

  // Clean up media stream on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Start capture via USB HDMI Capture Dongle
  const startHdmiCapture = async () => {
    setCaptureError(null);
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: selectedVideoDeviceId
          ? { deviceId: { exact: selectedVideoDeviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setIsCapturing(true);
      setStreamMode('HDMI_CAPTURE');

      stream.getVideoTracks()[0].onended = () => {
        stopCapture();
      };
    } catch (err: any) {
      setCaptureError(
        `No se pudo iniciar la captura HDMI USB: ${err.message}. Asegúrate de tener conectada una capturadora USB y conceder permisos.`
      );
    }
  };

  // Start Screen Capture API
  const startScreenCapture = async () => {
    setCaptureError(null);
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' },
        audio: true,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setIsCapturing(true);
      setStreamMode('SCREEN_CAPTURE');

      stream.getVideoTracks()[0].onended = () => {
        stopCapture();
      };
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        setCaptureError(`Error al compartir pantalla: ${err.message}`);
      }
    }
  };

  const stopCapture = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
    setStreamMode('DIGITAL_TWIN');
  };

  // Dynamic Interactive TV Screen Canvas (Smart TV UI: see where you're looking & what you're typing)
  useEffect(() => {
    if (streamMode !== 'DIGITAL_TWIN' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId: number;
    let step = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Dark background gradient
      const bgGradient = ctx.createLinearGradient(0, 0, width, height);
      bgGradient.addColorStop(0, '#0a1124');
      bgGradient.addColorStop(0.4, '#060a16');
      bgGradient.addColorStop(1, '#020409');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // Subtle dynamic ambient wave background
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.12)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x < width; x += 12) {
        const y = height / 2 + Math.sin((x + step * 3) * 0.012) * 35;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Subtle header info in corners (unobstructed, no blocking bars)
      ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.font = 'bold 22px "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(
        `${selectedDevice?.name || 'SAMSUNG SMART TV'}`,
        70,
        70
      );

      const now = new Date();
      const timeStr = now.toLocaleTimeString('es-MX', { hour12: false });
      ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.font = '18px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${timeStr}`, width - 70, 70);

      // =========================================================================
      // INTERACTIVE APP TILES & FOCUS (Centered cleanly in screen)
      // =========================================================================
      const tileW = 210;
      const tileH = 150;
      const tileGap = 24;
      const totalAppsW = tvApps.length * tileW + (tvApps.length - 1) * tileGap;
      const appsStartX = (width - totalAppsW) / 2;
      const appsStartY = (height - tileH) / 2;

      tvApps.forEach((app, idx) => {
        const x = appsStartX + idx * (tileW + tileGap);
        const y = appsStartY;
        const isFocused = idx === focusedAppIndex;

        ctx.fillStyle = isFocused ? 'rgba(30, 41, 59, 0.95)' : 'rgba(15, 23, 42, 0.6)';
        ctx.beginPath();
        ctx.roundRect(x, y, tileW, tileH, 20);
        ctx.fill();

        if (isFocused) {
          ctx.strokeStyle = '#22d3ee';
          ctx.lineWidth = 3.5;
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 20;
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else {
          ctx.strokeStyle = 'rgba(51, 65, 85, 0.6)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        ctx.fillStyle = isFocused ? '#22d3ee' : '#94a3b8';
        ctx.font = '38px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(app.icon, x + tileW / 2, y + 60);

        ctx.fillStyle = isFocused ? '#ffffff' : '#cbd5e1';
        ctx.font = 'bold 18px "Segoe UI", Roboto, sans-serif';
        ctx.fillText(app.name, x + tileW / 2, y + 96);

        ctx.fillStyle = isFocused ? '#38bdf8' : '#64748b';
        ctx.font = '12px sans-serif';
        ctx.fillText(app.category, x + tileW / 2, y + 122);

        if (isFocused) {
          ctx.fillStyle = '#06b6d4';
          ctx.beginPath();
          ctx.roundRect(x + 30, y + tileH + 10, tileW - 60, 24, 8);
          ctx.fill();

          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('▲ ENFOCADO', x + tileW / 2, y + tileH + 26);
        }
      });

      step++;
      frameId = requestAnimationFrame(render);
    };

    render();
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [streamMode, selectedDevice, pingLatency, lastSentText, typedText, focusedAppIndex]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!tvContainerRef.current) return;
    if (!document.fullscreenElement) {
      tvContainerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Instant Snapshot
  const captureSnapshot = () => {
    playTactileBeep(1000, 0.05);
    if (streamMode === 'DIGITAL_TWIN' && canvasRef.current) {
      setSnapshotUrl(canvasRef.current.toDataURL('image/png'));
    } else if (videoRef.current) {
      const snapCanvas = document.createElement('canvas');
      snapCanvas.width = videoRef.current.videoWidth || 1920;
      snapCanvas.height = videoRef.current.videoHeight || 1080;
      const ctx = snapCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, snapCanvas.width, snapCanvas.height);
        setSnapshotUrl(snapCanvas.toDataURL('image/png'));
      }
    }
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Top Header Bar: Screen Selector, Real-Time Status & Tools */}
      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-950">
            <Tv className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
              <span>Control Remoto & Vista de Pantalla en Vivo</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-semibold">
                INTEGRADO EN PANTALLA
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Escribe con tu laptop y controla la TV directamente dentro de la pantalla.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* TV Switcher Dropdown */}
          <select
            value={selectedDevice?.id || ''}
            onChange={(e) => {
              const found = devices.find((d) => d.id === e.target.value);
              if (found) {
                setSelectedDevice(found);
                setVolume(found.volume ?? 25);
              }
            }}
            className="text-xs font-mono font-semibold bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 focus:border-cyan-500 focus:outline-none shadow-inner"
          >
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.ip})
              </option>
            ))}
          </select>

          {/* Direct Ping button */}
          <button
            onClick={handlePing}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono flex items-center space-x-1.5 transition-colors"
            title="Comprobar enlace directo con la TV"
          >
            <Wifi className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ping {pingLatency !== null ? `(${pingLatency}ms)` : ''}</span>
          </button>

          {/* Source Mode Switcher */}
          <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono font-semibold">
            <button
              onClick={() => {
                if (isCapturing) stopCapture();
                setStreamMode('DIGITAL_TWIN');
              }}
              className={`px-2.5 py-1 rounded-md flex items-center space-x-1 transition-all ${
                streamMode === 'DIGITAL_TWIN'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Smart TV</span>
            </button>

            <button
              onClick={startHdmiCapture}
              className={`px-2.5 py-1 rounded-md flex items-center space-x-1 transition-all ${
                streamMode === 'HDMI_CAPTURE'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Capturar señal HDMI USB"
            >
              <Video className="w-3 h-3" />
              <span>HDMI USB</span>
            </button>

            <button
              onClick={startScreenCapture}
              className={`px-2.5 py-1 rounded-md flex items-center space-x-1 transition-all ${
                streamMode === 'SCREEN_CAPTURE'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Compartir pantalla de PC"
            >
              <Monitor className="w-3 h-3" />
              <span>Capturar PC</span>
            </button>
          </div>

          <div className="flex items-center space-x-1.5">
            {isCapturing && (
              <button
                onClick={stopCapture}
                className="px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold flex items-center space-x-1 shadow-md shadow-rose-600/30"
              >
                <Square className="w-3 h-3" />
                <span>Detener</span>
              </button>
            )}

            <button
              onClick={captureSnapshot}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              title="Captura instantánea (PNG)"
            >
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              title="Pantalla completa"
            >
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Capture Error Alert (if camera / capture card not present) */}
      {captureError && (
        <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-800/60 text-xs font-mono text-amber-200 flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block mb-0.5">Aviso de Captura de Video:</span>
            <span>{captureError}</span>
            <span className="block mt-0.5 text-slate-400">
              Mientras tanto, la <strong>Pantalla Smart TV</strong> está activa y sincronizada en tiempo real con tu teclado.
            </span>
          </div>
        </div>
      )}

      {/* Video Device selector when HDMI_CAPTURE is active */}
      {streamMode === 'HDMI_CAPTURE' && videoDevices.length > 0 && (
        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">Dispositivo de Captura de Video USB:</span>
          <select
            value={selectedVideoDeviceId}
            onChange={(e) => {
              setSelectedVideoDeviceId(e.target.value);
              if (isCapturing) {
                stopCapture();
                setTimeout(startHdmiCapture, 200);
              }
            }}
            className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none"
          >
            {videoDevices.map((v) => (
              <option key={v.deviceId} value={v.deviceId}>
                {v.label || `Cámara / Capturadora (${v.deviceId.slice(0, 8)})`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PANTALLA DE LA TV CON CONTROL Y TECLADO INTEGRADOS DENTRO DE ELLA          */}
      {/* ========================================================================= */}
      <div
        ref={tvContainerRef}
        className="relative rounded-3xl bg-slate-950 border-[6px] border-[#131b2c] shadow-[0_20px_60px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col"
      >

        {/* 16:9 Screen Display Window */}
        <div className="relative aspect-video w-full bg-black overflow-hidden flex items-center justify-center">
          {!isPowerOn ? (
            <div className="w-full h-full bg-[#05070c] flex flex-col items-center justify-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-slate-900/80 border border-slate-800 flex items-center justify-center text-slate-600">
                <Power className="w-7 h-7 text-rose-500 animate-pulse" />
              </div>
              <div className="text-center">
                <h4 className="text-sm font-bold text-slate-300 font-mono">
                  {selectedDevice?.name || 'Samsung Smart TV'} en Modo Standby
                </h4>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Pantalla apagada. Pulsa "Encender" en los controles abajo para activarla.
                </p>
              </div>
            </div>
          ) : streamMode === 'HDMI_CAPTURE' || streamMode === 'SCREEN_CAPTURE' ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
            />
          ) : (
            <canvas
              ref={canvasRef}
              width={1920}
              height={1080}
              className="w-full h-full object-contain"
            />
          )}

          {/* Volume Slider OSD Overlay */}
          {osdVolume.show && isPowerOn && (
            <div className="absolute right-6 top-1/2 -translate-y-1/2 animate-in fade-in slide-in-from-right-4 duration-300 z-30">
              <div className="p-3.5 rounded-2xl bg-slate-950/90 backdrop-blur-xl border border-cyan-500/40 text-white shadow-2xl flex flex-col items-center space-y-2.5 w-16">
                {osdVolume.muted ? (
                  <VolumeX className="w-6 h-6 text-rose-400 animate-pulse" />
                ) : (
                  <Volume2 className="w-6 h-6 text-cyan-400" />
                )}

                <div className="h-28 w-2.5 rounded-full bg-slate-800 overflow-hidden flex flex-col justify-end p-0.5">
                  <div
                    className="w-full rounded-full bg-gradient-to-t from-cyan-500 to-blue-400 transition-all duration-150"
                    style={{ height: `${osdVolume.muted ? 0 : osdVolume.level}%` }}
                  ></div>
                </div>

                <span className="text-[11px] font-mono font-bold text-cyan-300">
                  {osdVolume.muted ? 'MUTE' : osdVolume.level}
                </span>
              </div>
            </div>
          )}

          {/* Key Press HUD at Bottom Center of Screen Area */}
          {osdKey.show && isPowerOn && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2 duration-200 z-30 pointer-events-none">
              <div className="px-3.5 py-1.5 rounded-xl bg-slate-950/90 backdrop-blur-xl border border-slate-700 text-white shadow-2xl flex items-center space-x-2 text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                <span className="text-slate-200 font-bold">{osdKey.keyName}</span>
              </div>
            </div>
          )}

          {/* Laptop Keyboard Text OSD Banner */}
          {osdText.show && isPowerOn && (
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 animate-in fade-in zoom-in-95 duration-300 z-30 pointer-events-none max-w-[85%]">
              <div className="px-5 py-3 rounded-2xl bg-slate-950/95 backdrop-blur-2xl border border-cyan-400/60 text-white shadow-[0_15px_50px_rgba(6,182,212,0.4)] flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex-shrink-0">
                  <Keyboard className="w-5 h-5 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 block font-bold">
                    Texto escrito en la TV:
                  </span>
                  <span className="text-sm font-bold font-sans text-slate-100 truncate block">
                    "{osdText.text}"
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* CONTROLES Y TECLADO INTEGRADOS DENTRO DE LA PANTALLA (SIN ENTRADAS DE VIDEO)*/}
        {/* ========================================================================= */}
        <div className="w-full bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 p-3 space-y-2.5 z-30">
          {/* 1. LA PURA BARRA DEL TECLADO (Sin atajos de búsqueda) */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 flex items-center">
              <Keyboard className="w-4 h-4 text-cyan-400 absolute left-3 pointer-events-none" />
              <input
                ref={keyboardInputRef}
                type="text"
                placeholder="Escribe con el teclado de tu laptop y presiona Enter para escribir en la TV..."
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendText();
                  }
                }}
                className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl pl-9 pr-24 py-2 text-xs text-slate-100 focus:outline-none font-sans placeholder-slate-500 shadow-inner"
              />

              <div className="absolute right-1.5 flex items-center space-x-1">
                {typedText && (
                  <button
                    onClick={() => {
                      setTypedText('');
                      keyboardInputRef.current?.focus();
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    title="Limpiar"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => handleSendText()}
                  disabled={!typedText.trim() || isExecuting}
                  className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white font-mono text-xs font-bold flex items-center space-x-1 shadow-md shadow-cyan-600/30 disabled:opacity-40 transition-all"
                >
                  <Send className="w-3 h-3" />
                  <span>Enviar</span>
                </button>
              </div>
            </div>

            {/* Live Keyboard Passthrough Toggle Button */}
            <button
              onClick={() => {
                playTactileBeep(isKeyboardPassthrough ? 600 : 1100, 0.04);
                setIsKeyboardPassthrough(!isKeyboardPassthrough);
              }}
              className={`px-3 py-2 rounded-xl border text-xs font-mono font-bold flex items-center space-x-1.5 transition-all flex-shrink-0 ${
                isKeyboardPassthrough
                  ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/60 shadow-lg shadow-emerald-950'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-700'
              }`}
              title="Cualquier tecla de tu laptop (letras, flechas, Enter) se transmite a la TV"
            >
              <Keyboard className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isKeyboardPassthrough ? '🟢 En Vivo: ON' : '⌨️ Modo Teclado'}</span>
            </button>
          </div>

          {/* 2. CONTROL COMPACTO DENTRO DE LA PANTALLA (SIN ENTRADAS DE VIDEO) */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono pt-0.5">
            {/* Grupo Energía (Encender, Apagar, Reiniciar) */}
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => handleCommand('POWER_ON')}
                disabled={isExecuting}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold flex items-center space-x-1 shadow-md shadow-emerald-600/30 transition-all text-xs"
                title="Encender TV (WoL)"
              >
                <Power className="w-3.5 h-3.5" />
                <span>Encender</span>
              </button>

              <button
                onClick={() => handleCommand('POWER_OFF')}
                disabled={isExecuting}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold flex items-center space-x-1 shadow-md shadow-rose-600/30 transition-all text-xs"
                title="Apagar pantalla (Standby)"
              >
                <Power className="w-3.5 h-3.5" />
                <span>Apagar</span>
              </button>

              <button
                onClick={() => handleCommand('RESTART')}
                disabled={isExecuting}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                title="Reiniciar software de pantalla"
              >
                <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              </button>
            </div>

            {/* Grupo Volumen & Silenciar */}
            <div className="flex items-center space-x-2 bg-slate-900/90 px-3 py-1 rounded-xl border border-slate-800">
              <button
                onClick={() => handleCommand('VOLUME_DOWN')}
                className="p-1 rounded-lg text-slate-300 hover:bg-slate-800 active:scale-95"
                title="Bajar volumen"
              >
                <Volume1 className="w-3.5 h-3.5" />
              </button>

              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                onMouseUp={() => handleCommand('SET_VOLUME', { volume })}
                onTouchEnd={() => handleCommand('SET_VOLUME', { volume })}
                className="w-20 sm:w-28 accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />

              <button
                onClick={() => handleCommand('VOLUME_UP')}
                className="p-1 rounded-lg text-slate-300 hover:bg-slate-800 active:scale-95"
                title="Subir volumen"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleCommand('TOGGLE_MUTE')}
                className={`px-2 py-0.5 rounded-lg border text-[11px] font-bold ${
                  selectedDevice?.isMuted
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {selectedDevice?.isMuted ? 'MUTE ON' : 'MUTE'}
              </button>

              <span className="text-cyan-400 font-bold min-w-[28px] text-right">
                {volume}%
              </span>
            </div>

            {/* Grupo Cruceta D-Pad & Navegación Compacta */}
            <div className="flex items-center space-x-1.5">
              <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => handleCommand('KEY_PRESS', { key: 'LEFT' })}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-200 active:scale-95"
                  title="Izquierda"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-cyan-400" />
                </button>
                <button
                  onClick={() => handleCommand('KEY_PRESS', { key: 'UP' })}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-200 active:scale-95"
                  title="Arriba"
                >
                  <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
                </button>
                <button
                  onClick={() => handleCommand('KEY_PRESS', { key: 'ENTER' })}
                  className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] active:scale-95"
                  title="OK / Enter"
                >
                  OK
                </button>
                <button
                  onClick={() => handleCommand('KEY_PRESS', { key: 'DOWN' })}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-200 active:scale-95"
                  title="Abajo"
                >
                  <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
                </button>
                <button
                  onClick={() => handleCommand('KEY_PRESS', { key: 'RIGHT' })}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-200 active:scale-95"
                  title="Derecha"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
                </button>
              </div>

              {/* Botones Inicio, Menú, Volver */}
              <button
                onClick={() => handleCommand('KEY_PRESS', { key: 'HOME' })}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 active:scale-95"
                title="Inicio Smart Hub"
              >
                <Home className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleCommand('KEY_PRESS', { key: 'MENU' })}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 active:scale-95"
                title="Menú"
              >
                <Menu className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleCommand('KEY_PRESS', { key: 'BACK' })}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-purple-400 border border-slate-800 active:scale-95"
                title="Volver"
              >
                <CornerDownLeft className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleCommand('KEY_PRESS', { key: 'KEY_INFO' })}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 active:scale-95"
                title="Info de Señal"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Samsung Bezel with Standby LED & Logo */}
        <div className="w-full pt-1.5 pb-2 flex items-center justify-between px-4 text-[10px] font-mono text-slate-500 bg-slate-950">
          <span className="tracking-widest">SAMSUNG SMART TV 50" UHD</span>

          {/* Physical Standby LED Light */}
          <div className="flex flex-col items-center space-y-0.5">
            <span
              className={`w-2.5 h-2.5 rounded-full shadow-lg transition-all ${
                !isPowerOn
                  ? 'bg-rose-500 shadow-rose-500/80 animate-pulse'
                  : 'bg-cyan-500/40 shadow-cyan-500/20'
              }`}
            ></span>
            <span className="text-[9px] text-slate-600">LED</span>
          </div>

          <span>4K CRYSTAL PROCESSOR</span>
        </div>
      </div>

      {/* Snapshot Preview Modal */}
      {snapshotUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 p-5 rounded-2xl max-w-3xl w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-200 font-bold flex items-center space-x-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>Captura Instantánea de la Pantalla de la TV</span>
              </span>
              <button
                onClick={() => setSnapshotUrl(null)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Cerrar
              </button>
            </div>

            <img
              src={snapshotUrl}
              alt="Snapshot TV"
              className="w-full rounded-xl border border-slate-800 object-contain max-h-[70vh]"
            />

            <div className="flex justify-end space-x-3">
              <a
                href={snapshotUrl}
                download={`captura-tv-${selectedDevice?.name || 'samsung'}.png`}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold shadow-lg shadow-cyan-600/30"
              >
                Descargar Imagen PNG
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
