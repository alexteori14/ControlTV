import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDevices } from '../context/DeviceContext.js';
import { Device, CommandType, ScreenCapture } from '../types/index.js';
import { controlApi } from '../services/api.js';
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
  Keyboard,
  X,
  Download,
  Clock,
  History,
  Layers,
  Check,
  Radio,
  Sliders,
  ExternalLink,
} from 'lucide-react';

interface UnifiedRemoteScreenProps {
  initialDevice?: Device | null;
}

export const UnifiedRemoteScreen: React.FC<UnifiedRemoteScreenProps> = ({ initialDevice }) => {
  const { devices, executeCommand, pingDevice, latestCapture } = useDevices();

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

  // Video Streaming States (TV -> Laptop)
  const [streamMode, setStreamMode] = useState<'TV_CAPTURE' | 'HDMI_CAPTURE' | 'SCREEN_CAPTURE'>('TV_CAPTURE');
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // =========================================================================
  // SCREEN CAPTURE ENGINE STATES (Capturas reales tras cada acción del control)
  // =========================================================================
  const [activeCaptureUrl, setActiveCaptureUrl] = useState<string | null>(null);
  const [activeCaptureTime, setActiveCaptureTime] = useState<string | null>(null);
  const [lastActionLabel, setLastActionLabel] = useState<string>('Sincronizado');
  const [captureHistory, setCaptureHistory] = useState<ScreenCapture[]>([]);
  const [isShutterFlashing, setIsShutterFlashing] = useState<boolean>(false);
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState<boolean>(true);
  const [lastCaptureToast, setLastCaptureToast] = useState<string | null>(null);
  const [previewCapture, setPreviewCapture] = useState<ScreenCapture | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // Laptop Keyboard Writing States
  const [typedText, setTypedText] = useState('');
  const [isKeyboardPassthrough, setIsKeyboardPassthrough] = useState(false);
  const [lastSentText, setLastSentText] = useState<string | null>(null);

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

  // Trigger camera shutter flash effect
  const triggerShutterFlash = useCallback(() => {
    setIsShutterFlashing(true);
    window.setTimeout(() => {
      setIsShutterFlashing(false);
    }, 280);
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

  const showCaptureNotification = useCallback((message: string) => {
    setLastCaptureToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setLastCaptureToast(null);
    }, 3200);
  }, []);

  // Helper: Format human-readable action label
  const describeAction = (cmd: CommandType, payload?: any): string => {
    switch (cmd) {
      case 'POWER_ON':
        return 'Encender (POWER_ON)';
      case 'POWER_OFF':
        return 'Apagar (STANDBY)';
      case 'RESTART':
        return 'Reiniciar Sistema';
      case 'VOLUME_UP':
        return 'Subir Volumen (+5%)';
      case 'VOLUME_DOWN':
        return 'Bajar Volumen (-5%)';
      case 'SET_VOLUME':
        return `Ajustar Volumen (${payload?.volume ?? 25}%)`;
      case 'TOGGLE_MUTE':
        return 'Alternar Silencio (MUTE)';
      case 'MUTE':
        return 'Silenciar Audio (MUTE)';
      case 'UNMUTE':
        return 'Reactivar Audio';
      case 'SET_INPUT':
        return `Cambiar Entrada (${payload?.input || 'HDMI1'})`;
      case 'SET_CHANNEL':
        return `Sintonizar Canal (${payload?.channel || '05'})`;
      case 'KEY_PRESS':
        return `Tecla: ${payload?.key || 'ENTER'}`;
      case 'SEND_TEXT':
        return `Texto: "${payload?.text || ''}"`;
      default:
        return String(cmd);
    }
  };

  // -------------------------------------------------------------------------
  // INITIAL CAPTURE FETCHING & WEBSOCKET SYNC
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!selectedDevice) return;
    let isMounted = true;

    const loadInitialCapture = async () => {
      try {
        const cap = await controlApi.getScreenshot(selectedDevice.id);
        if (isMounted && cap?.screenshot) {
          setActiveCaptureUrl(cap.screenshot);
          setActiveCaptureTime(new Date(cap.timestamp).toLocaleTimeString('es-MX', { hour12: false }));
          setLastActionLabel(`Estado Actual (${cap.command || 'EN VIVO'})`);
        }
        const hist = await controlApi.getCaptures(selectedDevice.id);
        if (isMounted && hist && hist.length > 0) {
          setCaptureHistory(hist);
        }
      } catch (e) {
        console.warn('No se pudo precargar la captura de la TV:', e);
      }
    };

    loadInitialCapture();
    return () => {
      isMounted = false;
    };
  }, [selectedDevice?.id]);

  // Sync when server broadcasts new TV screen capture
  useEffect(() => {
    if (latestCapture && latestCapture.deviceId === selectedDevice?.id) {
      setActiveCaptureUrl(latestCapture.screenshot);
      setActiveCaptureTime(new Date(latestCapture.timestamp).toLocaleTimeString('es-MX', { hour12: false }));
      setLastActionLabel(`Acción: ${latestCapture.command}`);
      setCaptureHistory((prev) => {
        if (prev.some((c) => c.id === latestCapture.id)) return prev;
        return [latestCapture, ...prev.slice(0, 24)];
      });
    }
  }, [latestCapture, selectedDevice?.id]);

  // Capture frame from active HDMI/Screen video stream
  const captureFrameFromVideo = useCallback(
    (actionLabel: string) => {
      if (!videoRef.current) return;
      try {
        const snapCanvas = document.createElement('canvas');
        snapCanvas.width = videoRef.current.videoWidth || 1920;
        snapCanvas.height = videoRef.current.videoHeight || 1080;
        const ctx = snapCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, snapCanvas.width, snapCanvas.height);
          const dataUrl = snapCanvas.toDataURL('image/png');
          setActiveCaptureUrl(dataUrl);
          const timeStr = new Date().toLocaleTimeString('es-MX', { hour12: false });
          setActiveCaptureTime(timeStr);
          setLastActionLabel(actionLabel);

          const newCap: ScreenCapture = {
            id: String(Date.now()),
            deviceId: selectedDevice?.id || 'tv',
            deviceName: selectedDevice?.name,
            command: actionLabel,
            screenshot: dataUrl,
            width: snapCanvas.width,
            height: snapCanvas.height,
            timestamp: new Date().toISOString(),
            source: 'HDMI_CAPTURE',
          };
          setCaptureHistory((prev) => [newCap, ...prev.slice(0, 24)]);
          showCaptureNotification(`📸 Captura HDMI tomada: ${actionLabel}`);
        }
      } catch (err) {
        console.warn('Error al capturar fotograma de video:', err);
      }
    },
    [selectedDevice, showCaptureNotification]
  );

  // -------------------------------------------------------------------------
  // EXECUTE COMMAND AND AUTOMATICALLY CAPTURE TELEVISION SCREEN
  // -------------------------------------------------------------------------
  const handleCommand = async (command: CommandType, payload?: any) => {
    if (!selectedDevice) return;
    playTactileBeep();
    setIsExecuting(true);

    const actionText = describeAction(command, payload);
    setLastActionLabel(actionText);

    // OSD Popups
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
      const keyLabelMap: Record<string, string> = {
        UP: '▲ Arriba',
        DOWN: '▼ Abajo',
        LEFT: '◄ Izquierda',
        RIGHT: '► Derecha',
        ENTER: '✓ OK / Aceptar',
        OK: '✓ OK / Aceptar',
        HOME: '🏠 Inicio Smart Hub',
        MENU: '☰ Menú de Ajustes',
        BACK: '↩ Volver',
        KEY_INFO: 'ℹ Info de Señal',
      };
      triggerOsdKey(keyLabelMap[payload.key] || `Tecla: ${payload.key}`);
    }

    if (autoCaptureEnabled) {
      triggerShutterFlash();
    }

    // Execute remote command
    const res = await executeCommand(selectedDevice.id, command, payload);
    setIsExecuting(false);

    // Process screen capture
    if (autoCaptureEnabled) {
      if (isCapturing && (streamMode === 'HDMI_CAPTURE' || streamMode === 'SCREEN_CAPTURE')) {
        // Allow physical TV display pipeline 380ms to refresh
        window.setTimeout(() => {
          captureFrameFromVideo(actionText);
        }, 400);
      } else if (res?.screenshot) {
        const timeStr = new Date().toLocaleTimeString('es-MX', { hour12: false });
        setActiveCaptureUrl(res.screenshot);
        setActiveCaptureTime(timeStr);
        const newCap: ScreenCapture = {
          id: String(Date.now()),
          deviceId: selectedDevice.id,
          deviceName: selectedDevice.name,
          command,
          screenshot: res.screenshot,
          width: 1920,
          height: 1080,
          timestamp: res.screenshotTimestamp || new Date().toISOString(),
          source: 'TV_HARDWARE_RENDER',
        };
        setCaptureHistory((prev) => [newCap, ...prev.slice(0, 24)]);
        showCaptureNotification(`📸 Captura de TV guardada tras: ${actionText}`);
      }
    }
  };

  // Dispatch text from laptop keyboard to the TV (Samsung Tizen IME)
  const handleSendText = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : typedText).trim();
    if (!text || !selectedDevice) return;

    setLastSentText(text);
    triggerOsdText(text);
    if (textToSend === undefined) {
      setTypedText('');
    }
    await handleCommand('SEND_TEXT', { text });
  };

  // Manual on-demand capture button
  const handleManualCapture = async () => {
    if (!selectedDevice) return;
    playTactileBeep(1100, 0.05);
    triggerShutterFlash();

    if (isCapturing && (streamMode === 'HDMI_CAPTURE' || streamMode === 'SCREEN_CAPTURE')) {
      captureFrameFromVideo('Captura Manual');
      return;
    }

    try {
      const cap = await controlApi.takeCapture(selectedDevice.id);
      if (cap?.screenshot) {
        setActiveCaptureUrl(cap.screenshot);
        const timeStr = new Date(cap.timestamp).toLocaleTimeString('es-MX', { hour12: false });
        setActiveCaptureTime(timeStr);
        setLastActionLabel('Captura Manual');
        setCaptureHistory((prev) => [cap, ...prev.slice(0, 24)]);
        showCaptureNotification('📸 Captura manual de la TV tomada con éxito');
      }
    } catch (err: any) {
      console.warn('Error en captura manual:', err);
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
        handleCommand('KEY_PRESS', { key: 'LEFT' });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleCommand('KEY_PRESS', { key: 'RIGHT' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleCommand('KEY_PRESS', { key: 'ENTER' });
      } else if (e.key === 'Backspace' || e.key === 'Escape') {
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
  }, [isKeyboardPassthrough, selectedDevice]);

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
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
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
    setStreamMode('TV_CAPTURE');
  };

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

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Top Header Bar: Screen Selector, Real-Time Status & Capture Controls */}
      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-950">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
              <span>Control Remoto &amp; Capturas de Pantalla en Vivo</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>AUTO-CAPTURA ACTIVA</span>
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Cada acción del control (encender, apagar, volumen, etc.) toma y muestra una captura real de la televisión.
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
                setStreamMode('TV_CAPTURE');
              }}
              className={`px-2.5 py-1 rounded-md flex items-center space-x-1 transition-all ${
                streamMode === 'TV_CAPTURE'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Capturas automáticas de TV por IP"
            >
              <Camera className="w-3 h-3" />
              <span>Capturas TV</span>
            </button>

            <button
              onClick={startHdmiCapture}
              className={`px-2.5 py-1 rounded-md flex items-center space-x-1 transition-all ${
                streamMode === 'HDMI_CAPTURE'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Capturar señal HDMI USB física"
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

          {/* Action Tools: Take Screenshot, Auto-toggle, Fullscreen */}
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

            {/* Manual Capture Trigger Button */}
            <button
              onClick={handleManualCapture}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white font-mono text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-cyan-600/30 transition-all"
              title="Tomar captura de pantalla de la TV ahora"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Capturar Ahora</span>
            </button>

            {/* Auto Capture Toggle */}
            <button
              onClick={() => {
                setAutoCaptureEnabled(!autoCaptureEnabled);
                showCaptureNotification(
                  !autoCaptureEnabled
                    ? 'Captura automática ACTIVADA tras cada acción'
                    : 'Captura automática DESACTIVADA'
                );
              }}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center space-x-1 transition-colors ${
                autoCaptureEnabled
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600/60'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
              title="Tomar captura automáticamente con cada botón presionado"
            >
              <span className={`w-2 h-2 rounded-full ${autoCaptureEnabled ? 'bg-emerald-400' : 'bg-slate-500'}`} />
              <span>Auto</span>
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

      {/* Capture Error Alert */}
      {captureError && (
        <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-800/60 text-xs font-mono text-amber-200 flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block mb-0.5">Aviso de Captura de Video:</span>
            <span>{captureError}</span>
            <span className="block mt-0.5 text-slate-400">
              Mientras tanto, el <strong>Motor de Captura IP de la TV</strong> está activo y generando capturas reales con cada comando.
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
      {/* LAYOUT PRINCIPAL: CONTROL REMOTO A LA IZQUIERDA + PANTALLA TV A LA DERECHA */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch">
        {/* PANEL IZQUIERDO: CONTROL REMOTO COMPLETO CON CAPTURA AUTOMÁTICA */}
        <div className="w-full lg:w-80 flex-shrink-0 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border border-slate-800/90 shadow-[0_20px_50px_rgba(0,0,0,0.75)] p-4 flex flex-col justify-between space-y-3.5">
          {/* Cabecera del Control + Indicador */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
            <div className="flex items-center space-x-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isExecuting
                    ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee] scale-125'
                    : isPowerOn
                    ? 'bg-emerald-400'
                    : 'bg-rose-500'
                } transition-all`}
              />
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                Control Remoto TV
              </span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400/80 bg-cyan-950/40 border border-cyan-800/40 px-2 py-0.5 rounded-full font-bold">
              {isPowerOn ? 'PANTALLA ON' : 'STANDBY'}
            </span>
          </div>

          {/* 1. Grupo Energía (Encender, Apagar, Reiniciar) */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block px-1">
              Energía (Captura al instante)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleCommand('POWER_ON')}
                disabled={isExecuting}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-mono font-bold flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-600/25 transition-all text-xs"
                title="Encender TV y tomar captura"
              >
                <Power className="w-3.5 h-3.5" />
                <span>Encender</span>
              </button>

              <button
                onClick={() => handleCommand('POWER_OFF')}
                disabled={isExecuting}
                className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-mono font-bold flex items-center justify-center space-x-1.5 shadow-lg shadow-rose-600/25 transition-all text-xs"
                title="Apagar pantalla (Standby) y tomar captura"
              >
                <Power className="w-3.5 h-3.5" />
                <span>Apagar</span>
              </button>
            </div>

            <button
              onClick={() => handleCommand('RESTART')}
              disabled={isExecuting}
              className="w-full py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-300 border border-slate-800 text-xs font-mono flex items-center justify-center space-x-1.5 transition-all"
              title="Reiniciar software de pantalla"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Reiniciar Sistema TV</span>
            </button>
          </div>

          {/* 2. Selector Rápido de Entradas (HDMI 1, HDMI 2, TV, USB) */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block px-1">
              Entrada de Señal
            </span>
            <div className="grid grid-cols-4 gap-1">
              {(['HDMI1', 'HDMI2', 'TV', 'USB'] as const).map((inp) => (
                <button
                  key={inp}
                  onClick={() => handleCommand('SET_INPUT', { input: inp })}
                  disabled={isExecuting}
                  className={`py-1.5 px-1 rounded-lg text-[10px] font-mono font-bold border transition-all ${
                    selectedDevice?.currentInput === inp
                      ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-600/30'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                  title={`Conmutar a ${inp}`}
                >
                  {inp}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Cruceta D-Pad Circular Ergonómica */}
          <div className="flex flex-col items-center justify-center py-1">
            <div className="relative w-44 h-44 rounded-full bg-slate-900/90 border-2 border-slate-800 shadow-[inset_0_4px_20px_rgba(0,0,0,0.8)] flex items-center justify-center p-2">
              {/* Arriba */}
              <button
                onClick={() => handleCommand('KEY_PRESS', { key: 'UP' })}
                className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-10 rounded-t-2xl hover:bg-slate-800/90 active:scale-95 flex items-center justify-center text-slate-300 hover:text-cyan-400 transition-all"
                title="Arriba"
              >
                <ChevronUp className="w-5 h-5" />
              </button>

              {/* Abajo */}
              <button
                onClick={() => handleCommand('KEY_PRESS', { key: 'DOWN' })}
                className="absolute bottom-2 left-1/2 -translate-x-1/2 w-12 h-10 rounded-b-2xl hover:bg-slate-800/90 active:scale-95 flex items-center justify-center text-slate-300 hover:text-cyan-400 transition-all"
                title="Abajo"
              >
                <ChevronDown className="w-5 h-5" />
              </button>

              {/* Izquierda */}
              <button
                onClick={() => handleCommand('KEY_PRESS', { key: 'LEFT' })}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-12 rounded-l-2xl hover:bg-slate-800/90 active:scale-95 flex items-center justify-center text-slate-300 hover:text-cyan-400 transition-all"
                title="Izquierda"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Derecha */}
              <button
                onClick={() => handleCommand('KEY_PRESS', { key: 'RIGHT' })}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-12 rounded-r-2xl hover:bg-slate-800/90 active:scale-95 flex items-center justify-center text-slate-300 hover:text-cyan-400 transition-all"
                title="Derecha"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Botón Central OK */}
              <button
                onClick={() => handleCommand('KEY_PRESS', { key: 'ENTER' })}
                className="w-16 h-16 rounded-full bg-gradient-to-b from-cyan-500 to-cyan-700 hover:from-cyan-400 hover:to-cyan-600 active:scale-95 text-white font-mono font-bold text-xs shadow-[0_0_20px_rgba(6,182,212,0.4)] border border-cyan-300/40 flex items-center justify-center transition-all"
                title="OK / Aceptar"
              >
                OK
              </button>
            </div>
          </div>

          {/* 4. Botones de Navegación Rápida (Volver, Inicio, Menú, Info) */}
          <div className="grid grid-cols-4 gap-1.5">
            <button
              onClick={() => handleCommand('KEY_PRESS', { key: 'BACK' })}
              className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-purple-400 border border-slate-800/90 active:scale-95 transition-all space-y-1"
              title="Volver"
            >
              <CornerDownLeft className="w-4 h-4" />
              <span className="text-[10px] font-mono text-slate-300">Volver</span>
            </button>

            <button
              onClick={() => handleCommand('KEY_PRESS', { key: 'HOME' })}
              className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800/90 active:scale-95 transition-all space-y-1"
              title="Inicio Smart Hub"
            >
              <Home className="w-4 h-4" />
              <span className="text-[10px] font-mono text-slate-300">Inicio</span>
            </button>

            <button
              onClick={() => handleCommand('KEY_PRESS', { key: 'MENU' })}
              className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800/90 active:scale-95 transition-all space-y-1"
              title="Menú"
            >
              <Menu className="w-4 h-4" />
              <span className="text-[10px] font-mono text-slate-300">Menú</span>
            </button>

            <button
              onClick={() => handleCommand('KEY_PRESS', { key: 'KEY_INFO' })}
              className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800/90 active:scale-95 transition-all space-y-1"
              title="Info de Señal"
            >
              <Info className="w-4 h-4" />
              <span className="text-[10px] font-mono text-slate-300">Info</span>
            </button>
          </div>

          {/* 5. Grupo Volumen & Silenciar */}
          <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Volumen TV
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleCommand('TOGGLE_MUTE')}
                  className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold transition-all ${
                    selectedDevice?.isMuted
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {selectedDevice?.isMuted ? 'MUTE ON' : 'MUTE'}
                </button>
                <span className="text-xs font-mono font-bold text-cyan-400 min-w-[32px] text-right">
                  {volume}%
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleCommand('VOLUME_DOWN')}
                className="p-1.5 rounded-lg bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800 active:scale-95"
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
                className="flex-1 accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />

              <button
                onClick={() => handleCommand('VOLUME_UP')}
                className="p-1.5 rounded-lg bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800 active:scale-95"
                title="Subir volumen"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* PANEL DERECHO: PANTALLA DE CAPTURAS DE LA TV + TECLADO INFERIOR */}
        <div
          ref={tvContainerRef}
          className="flex-1 min-w-0 relative rounded-3xl bg-slate-950 border-[6px] border-[#131b2c] shadow-[0_20px_60px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col justify-between"
        >
          {/* 16:9 Screen Display Window with Direct Television Captures */}
          <div className="relative aspect-video w-full bg-black overflow-hidden flex items-center justify-center select-none">
            {/* Shutter flash animation layer when a screenshot is taken */}
            {isShutterFlashing && (
              <div className="absolute inset-0 bg-white/45 z-40 pointer-events-none animate-out fade-out duration-300 transition-opacity" />
            )}

            {/* Display Video (if HDMI capture active) OR Captured Television Image */}
            {streamMode === 'HDMI_CAPTURE' || streamMode === 'SCREEN_CAPTURE' ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
              />
            ) : activeCaptureUrl ? (
              <img
                src={activeCaptureUrl}
                alt="Captura de Pantalla de la Televisión"
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

            {/* Top-Left Live Capture HUD Banner */}
            <div className="absolute top-3 left-3 z-30 pointer-events-none flex items-center space-x-2">
              <div className="px-3 py-1 rounded-lg bg-slate-950/85 backdrop-blur-md border border-cyan-500/40 text-cyan-300 text-[11px] font-mono font-bold flex items-center space-x-2 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>📸 CAPTURA TV</span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-200">{lastActionLabel}</span>
                {activeCaptureTime && <span className="text-cyan-400">[{activeCaptureTime}]</span>}
              </div>
            </div>

            {/* Capture Notification Toast Pill */}
            {lastCaptureToast && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-in fade-in slide-in-from-bottom-3 duration-200">
                <div className="px-4 py-2 rounded-full bg-emerald-600/90 text-white font-mono text-xs font-bold shadow-2xl border border-emerald-400/50 flex items-center space-x-2 backdrop-blur-md">
                  <Camera className="w-4 h-4 text-emerald-200" />
                  <span>{lastCaptureToast}</span>
                </div>
              </div>
            )}

            {/* Volume Slider OSD Overlay */}
            {osdVolume.show && isPowerOn && (
              <div className="absolute right-6 top-1/2 -translate-y-1/2 animate-in fade-in slide-in-from-right-4 duration-300 z-30 pointer-events-none">
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

          {/* BARRA DEL TECLADO INTEGRADA EN LA PARTE INFERIOR DE LA PANTALLA */}
          <div className="w-full bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 p-3 z-30">
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
          </div>

          {/* Bottom Samsung Bezel with Standby LED & Logo */}
          <div className="w-full pt-1.5 pb-2 flex items-center justify-between px-4 text-[10px] font-mono text-slate-500 bg-slate-950 border-t border-slate-900">
            <span className="tracking-widest">
              {(selectedDevice?.brand || 'SAMSUNG').toUpperCase()} {selectedDevice?.name || 'SMART TV'}
            </span>

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

            <span>{selectedDevice?.model || 'UHD 4K CRYSTAL'}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CARRETE HISTÓRICO DE CAPTURAS POR ACCIÓN (Thumbnail Carousel)             */}
      {/* ========================================================================= */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-mono">
            <History className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-200">
              Historial de Capturas de Pantalla por Acción ({captureHistory.length})
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400 text-[11px]">
              Cada botón del control genera y almacena una captura
            </span>
          </div>

          {activeCaptureUrl && (
            <a
              href={activeCaptureUrl}
              download={`captura-tv-${selectedDevice?.name || 'tv'}-${Date.now()}.svg`}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-xs font-mono flex items-center space-x-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar Captura Actual</span>
            </a>
          )}
        </div>

        {captureHistory.length === 0 ? (
          <div className="p-6 text-center text-xs font-mono text-slate-500 border border-dashed border-slate-800 rounded-xl">
            Aún no hay capturas almacenadas. Presiona cualquier botón en el control remoto para comenzar a capturar.
          </div>
        ) : (
          <div className="flex items-center space-x-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
            {captureHistory.map((cap) => {
              const isActive = activeCaptureUrl === cap.screenshot;
              const time = new Date(cap.timestamp).toLocaleTimeString('es-MX', { hour12: false });

              return (
                <div
                  key={cap.id}
                  onClick={() => {
                    setActiveCaptureUrl(cap.screenshot);
                    setActiveCaptureTime(time);
                    setLastActionLabel(`Historial: ${cap.command}`);
                  }}
                  className={`flex-shrink-0 w-44 rounded-xl p-1.5 border cursor-pointer transition-all ${
                    isActive
                      ? 'bg-cyan-950/60 border-cyan-400 shadow-lg shadow-cyan-950'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="aspect-video w-full rounded-lg overflow-hidden bg-black relative border border-slate-900">
                    <img src={cap.screenshot} alt={cap.command} className="w-full h-full object-cover" />
                    {isActive && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]"></span>
                    )}
                  </div>
                  <div className="mt-1.5 px-1 flex items-center justify-between text-[10px] font-mono">
                    <span className="font-bold text-slate-200 truncate max-w-[90px]" title={cap.command}>
                      {cap.command}
                    </span>
                    <span className="text-slate-400">{time}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between px-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewCapture(cap);
                      }}
                      className="text-[10px] text-cyan-400 hover:underline flex items-center space-x-0.5"
                    >
                      <span>Ver</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                    <a
                      href={cap.screenshot}
                      download={`captura-${cap.command}-${time}.svg`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] text-slate-400 hover:text-slate-200"
                      title="Descargar imagen"
                    >
                      <Download className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fullscreen Snapshot Preview Modal */}
      {previewCapture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 p-5 rounded-2xl max-w-4xl w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-200 font-bold flex items-center space-x-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>
                  Captura de Pantalla TV: {previewCapture.command} (
                  {new Date(previewCapture.timestamp).toLocaleTimeString('es-MX', { hour12: false })})
                </span>
              </span>
              <button
                onClick={() => setPreviewCapture(null)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Cerrar
              </button>
            </div>

            <div className="aspect-video w-full rounded-xl border border-slate-800 bg-black overflow-hidden flex items-center justify-center">
              <img
                src={previewCapture.screenshot}
                alt="Snapshot TV"
                className="w-full h-full object-contain max-h-[70vh]"
              />
            </div>

            <div className="flex justify-between items-center text-xs font-mono text-slate-400">
              <span>Resolución: {previewCapture.width}x{previewCapture.height} FHD / 4K UHD</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setActiveCaptureUrl(previewCapture.screenshot);
                    setActiveCaptureTime(
                      new Date(previewCapture.timestamp).toLocaleTimeString('es-MX', { hour12: false })
                    );
                    setLastActionLabel(`Restaurado: ${previewCapture.command}`);
                    setPreviewCapture(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200"
                >
                  Establecer como Vista Principal
                </button>
                <a
                  href={previewCapture.screenshot}
                  download={`captura-tv-${previewCapture.command}-${Date.now()}.svg`}
                  className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-lg shadow-cyan-600/30 flex items-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar Archivo</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
