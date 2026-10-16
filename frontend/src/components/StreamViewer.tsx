import React, { useState, useRef, useEffect } from 'react';
import { useDevices } from '../context/DeviceContext.js';
import { Device } from '../types/index.js';
import { controlApi } from '../services/api.js';
import { socketService } from '../services/socket.js';
import {
  Maximize,
  Minimize,
  Camera,
  Play,
  Square,
  AlertCircle,
  Tv,
  Laptop,
  Cast,
  CheckCircle2,
  XCircle,
  HelpCircle,
  MonitorPlay,
  Share2,
  Copy,
  ExternalLink,
  Layers,
  Radio,
  Video,
  Check,
} from 'lucide-react';

interface StreamViewerProps {
  device?: Device | null;
}

export const StreamViewer: React.FC<StreamViewerProps> = ({ device: initialDevice }) => {
  const { devices } = useDevices();
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(initialDevice || null);
  
  // Direction switcher: TV -> Laptop (Monitoring) vs Laptop -> TV (Casting/Mirroring)
  const [direction, setDirection] = useState<'TV_TO_LAPTOP' | 'LAPTOP_TO_TV'>('TV_TO_LAPTOP');

  // TV -> Laptop States
  const [streamSource, setStreamSource] = useState<'HDMI_CAPTURE' | 'SCREEN_CAPTURE' | 'RTSP' | 'SIMULATED'>('SIMULATED');
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [rtspUrl, setRtspUrl] = useState('');
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Laptop -> TV (Broadcasting) States
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastFps, setBroadcastFps] = useState(15);
  const [framesSent, setFramesSent] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isLaunchingMiracast, setIsLaunchingMiracast] = useState(false);
  const [miracastMessage, setMiracastMessage] = useState<string | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const broadcastVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamContainerRef = useRef<HTMLDivElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const broadcastStreamRef = useRef<MediaStream | null>(null);
  const broadcastTimerRef = useRef<number | null>(null);

  // Derive target LAN URL for TV receiver
  const hostIp = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? '10.25.121.109'
    : window.location.hostname;
  const receiverUrl = `http://${hostIp}:5000/tv-mirror?deviceId=${selectedDevice?.id || 'global'}`;

  useEffect(() => {
    if (initialDevice) {
      setSelectedDevice(initialDevice);
    } else if (devices.length > 0 && !selectedDevice) {
      setSelectedDevice(devices[0]);
    }
  }, [initialDevice, devices]);

  // Enumerate USB video capture devices (HDMI capture cards, webcams)
  useEffect(() => {
    const listDevices = async () => {
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');
        setVideoDevices(videoInputs);
        if (videoInputs.length > 0 && !selectedVideoDeviceId) {
          // Default to first capture card if found
          const captureCard = videoInputs.find(
            (d) => d.label.toLowerCase().includes('capture') || d.label.toLowerCase().includes('cam') || d.label.toLowerCase().includes('usb')
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
  }, []);

  // Animated canvas for simulated test pattern (SMPTE / NOC Digital Signage)
  useEffect(() => {
    if (direction !== 'TV_TO_LAPTOP' || streamSource !== 'SIMULATED' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId: number;
    let angle = 0;

    const render = () => {
      ctx.fillStyle = '#070b14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Industrial Grid
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Live TV Status Title
      ctx.fillStyle = '#06b6d4';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        selectedDevice ? selectedDevice.name.toUpperCase() : 'SEÑAL EN VIVO CONTROLTV',
        canvas.width / 2,
        canvas.height / 2 - 40
      );

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px monospace';
      ctx.fillText(
        `IP: ${selectedDevice?.ip || '10.25.121.140'} • ENTRADA: ${selectedDevice?.currentInput || 'HDMI1'} • ESTADO: ${selectedDevice?.powerState || 'ON'}`,
        canvas.width / 2,
        canvas.height / 2
      );

      ctx.fillStyle = '#10b981';
      ctx.font = '13px monospace';
      ctx.fillText(
        `RESOLUCIÓN: 3840x2160 UHD • VOLUMEN: ${selectedDevice?.volume || 20}% • TEMP: ${selectedDevice?.temperature || 35.5}°C`,
        canvas.width / 2,
        canvas.height / 2 + 28
      );

      // Rotating radar indicator
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2 + 90);
      ctx.rotate(angle);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 1.5);
      ctx.stroke();
      ctx.restore();

      angle += 0.04;
      frameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [direction, streamSource, selectedDevice]);

  // --------------------------------------------------------------------------
  // DIRECCIÓN 1: TV -> Laptop (Captura de Video de la TV hacia la Laptop)
  // --------------------------------------------------------------------------

  // Start capture via USB HDMI Capture Dongle or selected webcam
  const startHdmiCapture = async () => {
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
      setStreamSource('HDMI_CAPTURE');

      stream.getVideoTracks()[0].onended = () => {
        stopCapture();
      };
    } catch (err: any) {
      alert(`Error al iniciar captura HDMI: ${err.message}. Asegúrate de conceder permisos de cámara al navegador.`);
    }
  };

  // Start Screen Capture API (for interim PC or desktop)
  const startScreenCapture = async () => {
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
      setStreamSource('SCREEN_CAPTURE');

      stream.getVideoTracks()[0].onended = () => {
        stopCapture();
      };
    } catch (err) {
      console.warn('Screen capture declined:', err);
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
    setStreamSource('SIMULATED');
  };

  // --------------------------------------------------------------------------
  // DIRECCIÓN 2: Laptop -> TV (Transmitir pantalla de la laptop a la TV)
  // --------------------------------------------------------------------------

  // Method 1: Launch Windows native Miracast / Wireless Projection
  const handleLaunchMiracast = async () => {
    setIsLaunchingMiracast(true);
    setMiracastMessage(null);
    try {
      const res = await controlApi.openMiracast();
      setMiracastMessage(res.message);
    } catch (err: any) {
      setMiracastMessage('Abriendo panel de conexión de Windows...');
    } finally {
      setIsLaunchingMiracast(false);
    }
  };

  // Method 2: WebRTC / WebSocket Broadcaster
  const startBroadcasting = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          frameRate: { ideal: broadcastFps },
        },
        audio: true,
      });

      broadcastStreamRef.current = stream;
      if (broadcastVideoRef.current) {
        broadcastVideoRef.current.srcObject = stream;
        broadcastVideoRef.current.play();
      }

      setIsBroadcasting(true);

      // Hidden canvas for frame extraction
      const offscreenCanvas = document.createElement('canvas');
      const offscreenCtx = offscreenCanvas.getContext('2d');
      const socket = socketService.getSocket();

      let count = 0;
      const intervalMs = Math.floor(1000 / broadcastFps);

      broadcastTimerRef.current = window.setInterval(() => {
        if (!broadcastVideoRef.current || broadcastVideoRef.current.readyState < 2) return;

        const vid = broadcastVideoRef.current;
        offscreenCanvas.width = 1280;
        offscreenCanvas.height = 720;
        offscreenCtx?.drawImage(vid, 0, 0, 1280, 720);

        const frameBase64 = offscreenCanvas.toDataURL('image/jpeg', 0.65);
        if (socket) {
          socket.emit('broadcast_screen_frame', {
            deviceId: selectedDevice?.id || 'global',
            frame: frameBase64,
          });
          count++;
          setFramesSent(count);
        }
      }, intervalMs);

      stream.getVideoTracks()[0].onended = () => {
        stopBroadcasting();
      };
    } catch (err: any) {
      console.warn('Broadcasting declined or failed:', err);
    }
  };

  const stopBroadcasting = () => {
    if (broadcastTimerRef.current) {
      clearInterval(broadcastTimerRef.current);
      broadcastTimerRef.current = null;
    }
    if (broadcastStreamRef.current) {
      broadcastStreamRef.current.getTracks().forEach((t) => t.stop());
      broadcastStreamRef.current = null;
    }
    if (broadcastVideoRef.current) {
      broadcastVideoRef.current.srcObject = null;
    }
    setIsBroadcasting(false);
    setFramesSent(0);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(receiverUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Fullscreen & Snapshot utilities
  const toggleFullscreen = () => {
    if (!streamContainerRef.current) return;
    if (!document.fullscreenElement) {
      streamContainerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const captureSnapshot = () => {
    if (streamSource === 'SIMULATED' && canvasRef.current) {
      setSnapshotUrl(canvasRef.current.toDataURL('image/png'));
    } else if (videoRef.current) {
      const snapCanvas = document.createElement('canvas');
      snapCanvas.width = videoRef.current.videoWidth || 1280;
      snapCanvas.height = videoRef.current.videoHeight || 720;
      const ctx = snapCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, snapCanvas.width, snapCanvas.height);
        setSnapshotUrl(snapCanvas.toDataURL('image/png'));
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Direction Selection Mode Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2 font-mono">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>CENTRO DE TRANSMISIÓN & MONITOREO BIDIRECCIONAL</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Elige la dirección de video: Monitorea la TV en tu laptop o proyecta tu pantalla hacia el televisor.
          </p>
        </div>

        {/* Direction Switcher Pill */}
        <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800">
          <button
            onClick={() => {
              if (isBroadcasting) stopBroadcasting();
              setDirection('TV_TO_LAPTOP');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center space-x-2 transition-all ${
              direction === 'TV_TO_LAPTOP'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>TV ➔ Laptop</span>
          </button>

          <button
            onClick={() => {
              if (isCapturing) stopCapture();
              setDirection('LAPTOP_TO_TV');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center space-x-2 transition-all ${
              direction === 'LAPTOP_TO_TV'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Laptop ➔ TV</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODO 1: VER LA PANTALLA DE LA TV EN LA LAPTOP (TV -> Laptop)             */}
      {/* ========================================================================= */}
      {direction === 'TV_TO_LAPTOP' && (
        <div className="space-y-6">
          {/* Top Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex flex-wrap items-center gap-3">
              {/* Device Selector */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">Pantalla Destino:</span>
                <select
                  value={selectedDevice?.id || ''}
                  onChange={(e) => {
                    const d = devices.find((item) => item.id === e.target.value);
                    setSelectedDevice(d || null);
                  }}
                  className="text-xs font-mono bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 focus:border-cyan-500 focus:outline-none"
                >
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.ip})
                    </option>
                  ))}
                </select>
              </div>

              {/* Video Device Input Selector (USB HDMI Capture / Webcams) */}
              {videoDevices.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Entrada HDMI USB / Cámara:</span>
                  <select
                    value={selectedVideoDeviceId}
                    onChange={(e) => setSelectedVideoDeviceId(e.target.value)}
                    disabled={isCapturing}
                    className="text-xs font-mono bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 focus:border-cyan-500 focus:outline-none max-w-xs truncate"
                  >
                    {videoDevices.map((v) => (
                      <option key={v.deviceId} value={v.deviceId}>
                        {v.label || `Dispositivo de Captura (${v.deviceId.slice(0, 8)})`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2 pt-2 sm:pt-0">
              {!isCapturing ? (
                <>
                  <button
                    onClick={startHdmiCapture}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs flex items-center space-x-1.5 shadow-md shadow-emerald-600/20 transition-all"
                    title="Capturar señal HDMI en vivo usando tarjeta de captura USB"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Captura HDMI USB</span>
                  </button>

                  <button
                    onClick={startScreenCapture}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs flex items-center space-x-1.5 shadow-md shadow-cyan-600/20 transition-all"
                    title="Capturar pantalla de PC intermedia conectada al TV"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Capturar PC/Ventana</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={stopCapture}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs flex items-center space-x-1.5 shadow-md shadow-rose-600/20 transition-all"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Detener Captura</span>
                </button>
              )}

              <button
                onClick={toggleFullscreen}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                title="Pantalla completa"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Main Video Screen Container */}
          <div
            ref={streamContainerRef}
            className="relative aspect-video w-full rounded-2xl bg-black border border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center group"
          >
            {streamSource === 'HDMI_CAPTURE' || streamSource === 'SCREEN_CAPTURE' ? (
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
                width={1280}
                height={720}
                className="w-full h-full object-contain"
              />
            )}

            {/* Live Feed Badge Overlay */}
            <div className="absolute top-4 left-4 flex items-center space-x-3 pointer-events-none">
              <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-800 text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                <span className="text-rose-400 font-bold uppercase">LIVE FEED</span>
              </div>

              <div className="px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-800 text-xs font-mono text-slate-300">
                {streamSource === 'HDMI_CAPTURE' && 'FUENTE: Tarjeta de Captura HDMI USB'}
                {streamSource === 'SCREEN_CAPTURE' && 'FUENTE: Screen Capture API (PC Intermedia)'}
                {streamSource === 'SIMULATED' && 'FUENTE: Monitor Signage Digital en Vivo'}
              </div>
            </div>

            {/* Snapshot Button on Hover */}
            <div className="absolute bottom-4 right-4 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={captureSnapshot}
                className="px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-mono flex items-center space-x-1.5 shadow-lg backdrop-blur-sm"
              >
                <Camera className="w-3.5 h-3.5 text-cyan-400" />
                <span>Captura instantánea</span>
              </button>
            </div>
          </div>

          {/* Architecture & Hardware Guide for TV -> Laptop */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center space-x-2 text-cyan-400">
              <AlertCircle className="w-4 h-4" />
              <h4 className="text-sm font-semibold tracking-wide uppercase font-mono">
                ¿Cómo ver la pantalla de la TV en la laptop en tiempo real?
              </h4>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Los televisores comerciales modernos (Samsung Tizen UHD) procesan video interno bajo protección HDCP y
              no codifican streaming de salida RTSP/IP de fábrica. Para visualizar la señal de la TV en la laptop,
              se proveen dos métodos estándar en centros de monitoreo industrial:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-emerald-400 font-bold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Método 1: Capturadora HDMI USB (Recomendado)</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Conecta la salida de video o splitter HDMI hacia una tarjeta de captura USB económica (USB Video/CamLink) en tu laptop.
                  Selecciona el dispositivo en el menú superior y pulsa <strong>"Captura HDMI USB"</strong> para ver la TV a 60 FPS con audio.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-cyan-400 font-bold flex items-center space-x-2">
                  <MonitorPlay className="w-4 h-4" />
                  <span>Método 2: PC Intermedia / Screen Capture</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Si tu televisor está conectado a una PC o reproductor de digital signage, pulsa <strong>"Capturar PC/Ventana"</strong> para
                  compartir la ventana o monitor completo directamente hacia esta consola web sin equipo adicional.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODO 2: TRANSMITIR PANTALLA DE LAPTOP A LA TV (Laptop -> TV)              */}
      {/* ========================================================================= */}
      {direction === 'LAPTOP_TO_TV' && (
        <div className="space-y-6">
          {/* Main Miracast Native Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-purple-950/40 border border-purple-800/40 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-mono font-bold">
                  <Cast className="w-3.5 h-3.5" />
                  <span>MÉTODO NATIVO RECOMENDADO: WINDOWS MIRACAST (SIN CABLES)</span>
                </div>
                <h3 className="text-base font-bold text-slate-100">
                  Duplicar Pantalla Directa a Samsung Smart TV (1080p/4K a 60 FPS)
                </h3>
                <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                  Tus televisores Samsung ({selectedDevice?.name || 'Smart TV'}) cuentan con receptor de hardware Miracast integrado.
                  Windows puede duplicar o extender tu escritorio de forma inalámbrica en ultra-baja latencia (&lt;30ms) con audio de alta fidelidad.
                </p>
              </div>

              {/* Open Miracast Panel Button */}
              <button
                onClick={handleLaunchMiracast}
                disabled={isLaunchingMiracast}
                className="px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold flex items-center space-x-2 shadow-lg shadow-purple-600/30 transition-all hover:scale-105 active:scale-95"
              >
                <Cast className="w-4 h-4" />
                <span>🚀 ABRIR PROYECCIÓN WINDOWS (WIN + K)</span>
              </button>
            </div>

            {miracastMessage && (
              <div className="p-3 rounded-lg bg-purple-950/60 border border-purple-700/50 text-xs font-mono text-purple-200">
                {miracastMessage}
              </div>
            )}

            {/* Quick 3-Step Guide */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs font-mono">
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-purple-400 font-bold mb-1">Paso 1: Abrir Conexión</div>
                <div className="text-slate-400 text-[11px]">
                  Presiona el botón morado de arriba o usa el atajo <strong>Win + K</strong> en tu teclado.
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-purple-400 font-bold mb-1">Paso 2: Seleccionar TV</div>
                <div className="text-slate-400 text-[11px]">
                  En el menú lateral de Windows, haz clic en tu televisor: <strong>{selectedDevice?.name || 'Samsung TV'}</strong>.
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-purple-400 font-bold mb-1">Paso 3: ¡Listo!</div>
                <div className="text-slate-400 text-[11px]">
                  La TV duplicará tu pantalla inmediatamente con video fluido y sonido sincronizado.
                </div>
              </div>
            </div>
          </div>

          {/* Method 2: Web Broadcaster (HTML5 / WebSocket Streaming) */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold">
                  <Share2 className="w-3.5 h-3.5" />
                  <span>MÉTODO WEB: EMISOR EN VIVO HTML5 PARA NAVEGADOR DE TV</span>
                </div>
                <h4 className="text-sm font-bold text-slate-100">
                  Transmitir Pantalla vía Servidor Web Local (Socket.IO Stream)
                </h4>
                <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                  Captura tu pantalla desde el navegador y transmítela por red local hacia cualquier televisor o dispositivo abriendo la URL receptora.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                {!isBroadcasting ? (
                  <button
                    onClick={startBroadcasting}
                    className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold flex items-center space-x-2 shadow-md shadow-cyan-600/30 transition-all"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Iniciar Transmisión Web</span>
                  </button>
                ) : (
                  <button
                    onClick={stopBroadcasting}
                    className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold flex items-center space-x-2 shadow-md shadow-rose-600/30 transition-all"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>Detener Transmisión</span>
                  </button>
                )}
              </div>
            </div>

            {/* Receiver URL Bar */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-mono text-slate-400 block uppercase">
                Enlace Receptor para el Navegador de la TV / Otros Dispositivos:
              </span>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={receiverUrl}
                  className="flex-1 bg-slate-900 border border-slate-700 text-cyan-400 font-mono text-xs rounded-lg px-3 py-2 select-all focus:outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center space-x-1.5 transition-colors border border-slate-700"
                  title="Copiar enlace"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
                </button>
                <a
                  href={receiverUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center space-x-1.5 transition-colors border border-slate-700"
                  title="Abrir en pestaña"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Probar</span>
                </a>
              </div>
            </div>

            {/* Live Broadcast Monitor Return */}
            {isBroadcasting && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="md:col-span-2 aspect-video rounded-xl bg-black border border-slate-800 overflow-hidden relative">
                  <video
                    ref={broadcastVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-3 left-3 flex items-center space-x-2 px-2.5 py-1 rounded-full bg-slate-950/80 border border-slate-800 text-[10px] font-mono text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>EMITIENDO EN VIVO</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-3 font-mono text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase">Estadísticas de Emisión:</span>
                    <div className="space-y-2 mt-2">
                      <div className="flex justify-between py-1 border-b border-slate-900">
                        <span className="text-slate-500">Fotogramas Emitidos:</span>
                        <span className="text-cyan-400 font-bold">{framesSent}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-900">
                        <span className="text-slate-500">Tasa de Cuadros:</span>
                        <span className="text-slate-200">{broadcastFps} FPS</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-900">
                        <span className="text-slate-500">Resolución:</span>
                        <span className="text-slate-200">1280x720 HD</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Canal WebSocket:</span>
                        <span className="text-emerald-400">stream_{selectedDevice?.id || 'global'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed">
                    Abre la URL receptora en la TV o cualquier navegador conectado al Wi-Fi para ver tu pantalla en tiempo real.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Snapshot Preview Modal */}
      {snapshotUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90">
          <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl max-w-2xl w-full space-y-3">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-300 font-bold">Captura Instantánea de Pantalla</span>
              <button
                onClick={() => setSnapshotUrl(null)}
                className="text-slate-400 hover:text-white"
              >
                Cerrar
              </button>
            </div>
            <img src={snapshotUrl} alt="Snapshot" className="w-full rounded-lg border border-slate-800" />
            <div className="flex justify-end">
              <a
                href={snapshotUrl}
                download={`snapshot-${selectedDevice?.name || 'screen'}.png`}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs"
              >
                Descargar PNG
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
