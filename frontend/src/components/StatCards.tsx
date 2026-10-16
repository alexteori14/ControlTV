import React from 'react';
import { useDevices } from '../context/DeviceContext.js';
import { Tv, CheckCircle2, AlertTriangle, Thermometer, Zap } from 'lucide-react';

export const StatCards: React.FC = () => {
  const { stats, devices } = useDevices();

  const total = stats?.totalDisplays ?? devices.length;
  const online = stats?.onlineDisplays ?? devices.filter((d) => d.status === 'ONLINE').length;
  const offline = stats?.offlineDisplays ?? (total - online);
  const avgTemp = stats?.averageTemperature ?? 34.0;
  const poweredOn = stats?.poweredOnDisplays ?? devices.filter((d) => d.powerState === 'ON').length;
  const alerts = stats?.activeAlerts ?? 0;

  const availability = total > 0 ? Math.round((online / total) * 100) : 100;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Displays */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-bl-full pointer-events-none group-hover:bg-cyan-500/10 transition-colors" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">Pantallas Totales</span>
          <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-800/40 text-cyan-400">
            <Tv className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-bold font-mono text-slate-100">{total}</span>
          <span className="text-xs text-slate-400 font-mono">unidades registradas</span>
        </div>
        <div className="mt-3 flex items-center space-x-2 text-[11px] font-mono text-slate-500">
          <Zap className="w-3 h-3 text-amber-400" />
          <span>{poweredOn} Encendidas ({Math.round((poweredOn / (total || 1)) * 100)}%)</span>
        </div>
      </div>

      {/* Online / Network Connectivity */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">Estado Conectividad</span>
          <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-bold font-mono text-emerald-400">{availability}%</span>
          <span className="text-xs text-emerald-500/80 font-mono">disponibilidad</span>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] font-mono">
          <span className="text-emerald-400">{online} En Línea</span>
          <span className={offline > 0 ? 'text-rose-400' : 'text-slate-500'}>
            {offline} Desconectadas
          </span>
        </div>
      </div>

      {/* Average Temperature */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full pointer-events-none group-hover:bg-amber-500/10 transition-colors" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">Temperatura Media</span>
          <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-800/40 text-amber-400">
            <Thermometer className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-bold font-mono text-amber-400">{avgTemp}°C</span>
          <span className="text-xs text-slate-400 font-mono">chasis interno</span>
        </div>
        <div className="mt-3 flex items-center space-x-1.5 text-[11px] font-mono text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Rango operativo seguro (&lt; 45°C)</span>
        </div>
      </div>

      {/* System Alerts */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-bl-full pointer-events-none group-hover:bg-rose-500/10 transition-colors" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">Alertas del Sistema</span>
          <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-800/40 text-rose-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className={`text-3xl font-bold font-mono ${alerts > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
            {alerts}
          </span>
          <span className="text-xs text-slate-400 font-mono">eventos críticos</span>
        </div>
        <div className="mt-3 text-[11px] font-mono text-slate-500">
          {alerts === 0 ? 'Sin anomalías térmicas ni caídas' : `${alerts} pantallas requieren atención`}
        </div>
      </div>
    </div>
  );
};
