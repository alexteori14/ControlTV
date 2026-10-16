import React, { useState, useEffect } from 'react';
import { useDevices } from '../context/DeviceContext.js';
import { Device, TelemetryPoint } from '../types/index.js';
import { telemetryApi } from '../services/api.js';
import { StatCards } from './StatCards.js';
import {
  Power,
  Volume2,
  VolumeX,
  Radio,
  Video,
  Activity,
  Cpu,
  Clock,
  ArrowRight,
  RefreshCw,
  Search,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface IndustrialDashboardProps {
  onOpenRemote: (device: Device) => void;
  onOpenStream: (device: Device) => void;
}

export const IndustrialDashboard: React.FC<IndustrialDashboardProps> = ({
  onOpenRemote,
  onOpenStream,
}) => {
  const { devices, refreshDevices, quickPower, quickMute, quickInput, isLoading } = useDevices();
  const [selectedForChart, setSelectedForChart] = useState<string>('');
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryPoint[]>([]);
  const [filterBrand, setFilterBrand] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Set default selected device for chart
  useEffect(() => {
    if (devices.length > 0 && !selectedForChart) {
      setSelectedForChart(devices[0].id);
    }
  }, [devices, selectedForChart]);

  // Fetch telemetry for chart
  useEffect(() => {
    if (!selectedForChart) return;
    telemetryApi.getDeviceTelemetry(selectedForChart).then((data) => {
      setTelemetryHistory(data);
    });

    const interval = setInterval(() => {
      if (selectedForChart) {
        telemetryApi.getDeviceTelemetry(selectedForChart).then((data) => {
          setTelemetryHistory(data);
        });
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedForChart]);

  const activeDevice = devices.find((d) => d.id === selectedForChart);

  // Filter devices
  const filteredDevices = devices.filter((d) => {
    const matchesBrand = filterBrand === 'ALL' || d.brand.toLowerCase() === filterBrand.toLowerCase();
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.ip.includes(searchQuery) ||
      (d.location && d.location.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesBrand && matchesSearch;
  });

  const brands = Array.from(new Set(devices.map((d) => d.brand)));

  return (
    <div className="space-y-6">
      {/* Top Stats Cards */}
      <StatCards />

      {/* Real-time Telemetry Analytics & Live NOC Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Real-time Telemetry Trend Chart */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                <h3 className="text-sm font-semibold text-slate-200 tracking-wide uppercase font-mono">
                  Telemetría Térmica & Latencia en Tiempo Real
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Monitor dinámico de temperatura (°C) y tiempo de respuesta de red (ms)
              </p>
            </div>

            {/* Target Display Selector */}
            <select
              value={selectedForChart}
              onChange={(e) => setSelectedForChart(e.target.value)}
              className="text-xs font-mono bg-slate-950 border border-slate-700 text-slate-300 rounded-lg px-3 py-1.5 focus:border-cyan-500 focus:outline-none"
            >
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.ip})
                </option>
              ))}
            </select>
          </div>

          {/* Chart View */}
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetryHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(val) => {
                    try {
                      return new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    } catch {
                      return '';
                    }
                  }}
                  stroke="#475569"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                />
                <YAxis stroke="#475569" tick={{ fontSize: 10, fill: '#64748b' }} domain={[20, 60]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  labelFormatter={(val: any) => (val ? new Date(String(val)).toLocaleString() : '')}
                />
                <Area
                  type="monotone"
                  dataKey="temperature"
                  name="Temperatura (°C)"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#tempGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="latency_ms"
                  name="Latencia (ms)"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  fillOpacity={1}
                  fill="url(#latencyGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400"></span>
                <span>Temperatura ({activeDevice?.temperature ?? '--'}°C)</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400"></span>
                <span>Latencia de Red (Ping)</span>
              </span>
            </div>
            <span>Heartbeat: cada 15s</span>
          </div>
        </div>

        {/* Right 1 Col: Quick Device Monitor Card */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">
                Monitor Maestro
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  activeDevice?.status === 'ONLINE'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}
              >
                {activeDevice?.status === 'ONLINE' ? 'EN LÍNEA' : 'OFFLINE'}
              </span>
            </div>

            <h4 className="font-bold text-base text-slate-100 truncate">
              {activeDevice?.name || 'Selecciona pantalla'}
            </h4>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {activeDevice?.ip}:{activeDevice?.port} • {activeDevice?.brand}
            </p>

            <div className="mt-4 space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400 flex items-center space-x-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Protocolo / Driver</span>
                </span>
                <span className="text-cyan-300 font-semibold">{activeDevice?.connectionType}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400 flex items-center space-x-1.5">
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                  <span>Estado Energía</span>
                </span>
                <span
                  className={
                    activeDevice?.powerState === 'ON'
                      ? 'text-emerald-400 font-semibold'
                      : 'text-slate-400'
                  }
                >
                  {activeDevice?.powerState}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400 flex items-center space-x-1.5">
                  <Radio className="w-3.5 h-3.5 text-blue-400" />
                  <span>Entrada Actual</span>
                </span>
                <span className="text-slate-200 bg-slate-800 px-2 py-0.5 rounded">
                  {activeDevice?.currentInput}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-400 flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Ubicación</span>
                </span>
                <span className="text-slate-300 truncate max-w-[140px]">
                  {activeDevice?.location || 'General'}
                </span>
              </div>
            </div>
          </div>

          {activeDevice && (
            <div className="mt-4 pt-4 border-t border-slate-800 flex space-x-2">
              <button
                onClick={() => onOpenRemote(activeDevice)}
                className="flex-1 py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-cyan-600/20 transition-all"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Control Táctil</span>
              </button>
              <button
                onClick={() => onOpenStream(activeDevice)}
                className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center justify-center space-x-1.5 transition-colors"
                title="Vista en vivo"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Stream</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Screen Matrix Grid: Interactive Display Cards */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <span>Matriz de Pantallas & Digital Signage</span>
              <span className="text-xs font-mono font-normal text-slate-400">
                ({filteredDevices.length} visualizadas)
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Control rápido de energía, entradas y telemetría por dispositivo
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por IP/Nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <select
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">Todas las Marcas</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            <button
              onClick={() => refreshDevices()}
              disabled={isLoading}
              title="Refrescar estados"
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Display Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDevices.map((device) => {
            const isOnline = device.status === 'ONLINE';
            const isPowerOn = device.powerState === 'ON';

            return (
              <div
                key={device.id}
                className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group shadow-sm"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            isOnline
                              ? isPowerOn
                                ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                                : 'bg-amber-400'
                              : 'bg-rose-500'
                          }`}
                        />
                        <h4 className="font-bold text-sm text-slate-100 group-hover:text-cyan-400 transition-colors">
                          {device.name}
                        </h4>
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        {device.ip}:{device.port} • {device.brand}
                      </div>
                    </div>

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {device.connectionType}
                    </span>
                  </div>

                  {/* Device Metrics Bar */}
                  <div className="grid grid-cols-3 gap-2 mt-4 text-center font-mono text-xs">
                    <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                      <div className="text-[10px] text-slate-500 uppercase">Energía</div>
                      <div className={`font-bold mt-0.5 ${isPowerOn ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {device.powerState}
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                      <div className="text-[10px] text-slate-500 uppercase">Temp</div>
                      <div className="font-bold text-amber-400 mt-0.5">
                        {device.temperature ? `${device.temperature}°C` : 'N/A'}
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                      <div className="text-[10px] text-slate-500 uppercase">Entrada</div>
                      <div className="font-bold text-cyan-400 mt-0.5 truncate">
                        {device.currentInput}
                      </div>
                    </div>
                  </div>

                  {/* Quick Input Selection Bar */}
                  <div className="mt-3 flex items-center space-x-1.5 overflow-x-auto py-1">
                    <span className="text-[10px] font-mono text-slate-500 uppercase mr-1">Input:</span>
                    {['HDMI1', 'HDMI2', 'HDMI3', 'DISPLAYPORT'].map((inp) => (
                      <button
                        key={inp}
                        onClick={() => quickInput(device.id, inp)}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded transition-all ${
                          device.currentInput === inp
                            ? 'bg-cyan-600 text-white font-bold'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                        }`}
                      >
                        {inp.replace('DISPLAYPORT', 'DP')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bottom Actions Bar */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    {/* Power Toggle Button */}
                    <button
                      onClick={() => quickPower(device.id, isPowerOn ? 'OFF' : 'ON')}
                      className={`p-1.5 rounded-lg border transition-all ${
                        isPowerOn
                          ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      }`}
                      title={isPowerOn ? 'Apagar pantalla' : 'Encender pantalla'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>

                    {/* Mute Toggle */}
                    <button
                      onClick={() => quickMute(device.id)}
                      className={`p-1.5 rounded-lg border transition-all ${
                        device.isMuted
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                      title={device.isMuted ? 'Desmutear' : 'Silenciar'}
                    >
                      {device.isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onOpenStream(device)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs flex items-center space-x-1 transition-colors"
                      title="Ver pantalla en vivo"
                    >
                      <Video className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onOpenRemote(device)}
                      className="py-1 px-3 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono flex items-center space-x-1 transition-all"
                    >
                      <span>Control</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
