import React, { useState } from 'react';
import { Device, CommandType } from '../types/index.js';
import { useDevices } from '../context/DeviceContext.js';
import {
  X,
  Power,
  RotateCcw,
  Volume2,
  VolumeX,
  Volume1,
  Sun,
  Radio,
  Send,
  Wifi,
  Thermometer,
  Tv,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Home,
  Menu,
  CornerDownLeft,
  Clock,
} from 'lucide-react';

interface RemoteControlModalProps {
  device: Device;
  onClose: () => void;
}

export const RemoteControlModal: React.FC<RemoteControlModalProps> = ({ device, onClose }) => {
  const { executeCommand, pingDevice, lastCommandResult } = useDevices();
  const [volume, setVolume] = useState<number>(device.volume ?? 20);
  const [brightness, setBrightness] = useState<number>(device.brightness ?? 80);
  const [isExecuting, setIsExecuting] = useState(false);
  const [rawCommand, setRawCommand] = useState('');
  const [channelInput, setChannelInput] = useState('');
  const [pingLatency, setPingLatency] = useState<number | null>(null);

  const isPowerOn = device.powerState === 'ON';

  const handleCommand = async (command: CommandType, payload?: any) => {
    setIsExecuting(true);
    await executeCommand(device.id, command, payload);
    setIsExecuting(false);
  };

  const handlePing = async () => {
    const startTime = Date.now();
    const ok = await pingDevice(device.id);
    setPingLatency(ok ? Date.now() - startTime : null);
  };

  const handleVolumeChange = (newVal: number) => {
    setVolume(newVal);
    handleCommand('SET_VOLUME', { volume: newVal });
  };

  const handleBrightnessChange = (newVal: number) => {
    setBrightness(newVal);
    handleCommand('SET_BRIGHTNESS', { brightness: newVal });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-100">{device.name}</h3>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    device.status === 'ONLINE'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {device.status}
                </span>
              </div>
              <div className="text-xs font-mono text-slate-400">
                {device.ip}:{device.port} • {device.brand} ({device.connectionType})
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handlePing}
              className="text-xs font-mono px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center space-x-1.5 transition-colors"
              title="Comprobar enlace directo"
            >
              <Wifi className="w-3.5 h-3.5 text-cyan-400" />
              <span>Ping {pingLatency !== null ? `(${pingLatency}ms)` : ''}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-900/50">
          {/* Left Column (Cols 1-7): Tactile Remote Control Surface */}
          <div className="md:col-span-7 space-y-6">
            {/* Top Power & System Controls */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono uppercase text-slate-400 font-semibold">Alimentación:</span>
                <span
                  className={`text-xs font-mono font-bold ${
                    isPowerOn ? 'text-emerald-400' : 'text-slate-500'
                  }`}
                >
                  {device.powerState}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleCommand('POWER_ON')}
                  disabled={isExecuting}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center space-x-1.5 shadow-md shadow-emerald-600/30 transition-all"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>Encender</span>
                </button>

                <button
                  onClick={() => handleCommand('POWER_OFF')}
                  disabled={isExecuting}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs flex items-center space-x-1.5 shadow-md shadow-rose-600/30 transition-all"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>Apagar</span>
                </button>

                <button
                  onClick={() => handleCommand('RESTART')}
                  disabled={isExecuting}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                  title="Reiniciar pantalla"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Inputs Selector Matrix */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <div className="text-xs font-mono uppercase text-slate-400 font-semibold mb-3 flex items-center space-x-2">
                <Tv className="w-3.5 h-3.5 text-cyan-400" />
                <span>Selector de Entradas de Video</span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {[
                  { id: 'HDMI1', label: 'HDMI 1' },
                  { id: 'HDMI2', label: 'HDMI 2' },
                  { id: 'HDMI3', label: 'HDMI 3' },
                  { id: 'DISPLAYPORT', label: 'DisplayPort' },
                  { id: 'USB', label: 'USB Media' },
                ].map((input) => {
                  const isCurrent = device.currentInput === input.id;
                  return (
                    <button
                      key={input.id}
                      onClick={() => handleCommand('SET_INPUT', { input: input.id })}
                      disabled={isExecuting}
                      className={`py-2 px-2 rounded-lg text-xs font-mono font-semibold transition-all ${
                        isCurrent
                          ? 'bg-cyan-600 text-white border border-cyan-400 shadow-lg shadow-cyan-600/30'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                      }`}
                    >
                      {input.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sliders: Volume and Brightness */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Volume Slider */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 flex items-center space-x-1.5 font-semibold">
                    <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>Volumen</span>
                  </span>
                  <span className="text-cyan-400 font-bold">{volume}%</span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  onMouseUp={() => handleVolumeChange(volume)}
                  onTouchEnd={() => handleVolumeChange(volume)}
                  className="w-full accent-cyan-500 cursor-pointer"
                />

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => handleCommand('VOLUME_DOWN')}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                    title="Bajar volumen"
                  >
                    <Volume1 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleCommand('TOGGLE_MUTE')}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                      device.isMuted
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                    }`}
                  >
                    {device.isMuted ? 'Silenciado' : 'Silenciar'}
                  </button>

                  <button
                    onClick={() => handleCommand('VOLUME_UP')}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                    title="Subir volumen"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Brightness Slider */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 flex items-center space-x-1.5 font-semibold">
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Brillo / Panel</span>
                  </span>
                  <span className="text-amber-400 font-bold">{brightness}%</span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  onMouseUp={() => handleBrightnessChange(brightness)}
                  onTouchEnd={() => handleBrightnessChange(brightness)}
                  className="w-full accent-amber-500 cursor-pointer"
                />

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => handleCommand('BRIGHTNESS_DOWN')}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                    title="Bajar brillo"
                  >
                    -5%
                  </button>
                  <span className="text-[11px] font-mono text-slate-500">Ajuste Panel</span>
                  <button
                    onClick={() => handleCommand('BRIGHTNESS_UP')}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                    title="Subir brillo"
                  >
                    +5%
                  </button>
                </div>
              </div>
            </div>

            {/* Directional D-Pad Navigation */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col items-center">
              <div className="text-xs font-mono uppercase text-slate-400 font-semibold mb-3">
                Cruceta de Navegación & Menú
              </div>

              <div className="grid grid-cols-3 gap-2 w-48">
                <div></div>
                <button
                  onClick={() => handleCommand('KEY_PRESS', { key: 'UP' })}
                  className="p-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 flex justify-center"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
                <div></div>

                <button
                  onClick={() => handleCommand('KEY_PRESS', { key: 'LEFT' })}
                  className="p-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 flex justify-center"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleCommand('KEY_PRESS', { key: 'ENTER' })}
                  className="p-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex justify-center items-center shadow-lg shadow-cyan-600/30"
                >
                  OK
                </button>
                <button
                  onClick={() => handleCommand('KEY_PRESS', { key: 'RIGHT' })}
                  className="p-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 flex justify-center"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <div></div>
                <button
                  onClick={() => handleCommand('KEY_PRESS', { key: 'DOWN' })}
                  className="p-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 flex justify-center"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
                <div></div>
              </div>

              <div className="flex items-center space-x-3 mt-4">
                <button
                  onClick={() => handleCommand('KEY_PRESS', { key: 'HOME' })}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs flex items-center space-x-1"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Inicio</span>
                </button>
                <button
                  onClick={() => handleCommand('KEY_PRESS', { key: 'MENU' })}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs flex items-center space-x-1"
                >
                  <Menu className="w-3.5 h-3.5" />
                  <span>Menú</span>
                </button>
                <button
                  onClick={() => handleCommand('KEY_PRESS', { key: 'BACK' })}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs flex items-center space-x-1"
                >
                  <CornerDownLeft className="w-3.5 h-3.5" />
                  <span>Volver</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column (Cols 8-12): Telemetry, Channels & Raw Console */}
          <div className="md:col-span-5 space-y-6">
            {/* Real-time Hardware Telemetry */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="text-xs font-mono uppercase text-slate-400 font-semibold flex items-center space-x-2">
                <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                <span>Telemetría de Hardware</span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Temperatura Interna:</span>
                  <span className="text-amber-400 font-bold">
                    {device.temperature ? `${device.temperature}°C` : 'No reportada'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">MAC Address:</span>
                  <span className="text-slate-200">{device.macAddress || 'No configurada'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Tiempo en Línea:</span>
                  <span className="text-slate-200 flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    <span>{Math.floor((device.uptimeSeconds || 3600) / 3600)}h {Math.floor(((device.uptimeSeconds || 3600) % 3600) / 60)}m</span>
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Última Comunicación:</span>
                  <span className="text-slate-300 text-[11px]">
                    {device.lastCommunication ? new Date(device.lastCommunication).toLocaleTimeString() : 'Reciente'}
                  </span>
                </div>
              </div>
            </div>

            {/* Direct Channel Tuner */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="text-xs font-mono uppercase text-slate-400 font-semibold">
                Sintonizador de Canal
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Ej: CH-04 o 10.1"
                  value={channelInput}
                  onChange={(e) => setChannelInput(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
                <button
                  onClick={() => {
                    if (channelInput) handleCommand('SET_CHANNEL', { channel: channelInput });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs"
                >
                  Sintonizar
                </button>
              </div>
            </div>

            {/* Raw Protocol Command Terminal */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-slate-400 font-semibold">
                  Consola de Comandos Crudos
                </span>
                <span className="text-[10px] font-mono text-cyan-400">
                  {device.connectionType}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                Envía sintaxis nativa directa (ej. %1POWR ?, ka 01 01, AA 11 01...)
              </p>

              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Comando crudo..."
                  value={rawCommand}
                  onChange={(e) => setRawCommand(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
                <button
                  onClick={() => {
                    if (rawCommand) handleCommand('RAW_COMMAND', { raw: rawCommand });
                  }}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700"
                  title="Enviar comando crudo"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Last Command Status Feed */}
              {lastCommandResult && lastCommandResult.deviceId === device.id && (
                <div
                  className={`p-2.5 rounded-lg text-xs font-mono border ${
                    lastCommandResult.success
                      ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
                      : 'bg-rose-950/40 text-rose-300 border-rose-800/60'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>{lastCommandResult.command}</span>
                    <span className="text-[10px] text-slate-400">{lastCommandResult.executionTimeMs}ms</span>
                  </div>
                  <div className="text-[11px] mt-0.5 truncate">{lastCommandResult.message}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
