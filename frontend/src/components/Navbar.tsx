import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useDevices } from '../context/DeviceContext.js';
import { Monitor, Wifi, WifiOff, Shield, LogOut, Clock, Activity } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { devices, isSocketConnected } = useDevices();
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const onlineCount = devices.filter((d) => d.status === 'ONLINE').length;

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'SUPERVISOR':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'OPERATOR':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Brand & System Title */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Monitor className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-bold text-lg text-slate-100 tracking-wide">ControlTV NOC</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300">
              v1.0-ENTERPRISE
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">Centro de Control y Monitoreo Digital Signage & Smart TV</p>
        </div>
      </div>

      {/* Center Status Indicators */}
      <div className="hidden md:flex items-center space-x-6 text-xs font-mono">
        {/* WebSocket Real-time Pulse */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800">
          {isSocketConnected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">WS HUB CONECTADO</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-rose-500"></span>
              <WifiOff className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-rose-400 font-medium">DESCONECTADO</span>
            </>
          )}
        </div>

        {/* Display Counter */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-300">
            PANTALLAS:{' '}
            <strong className="text-emerald-400">{onlineCount}</strong>
            <span className="text-slate-500">/</span>
            <strong className="text-slate-200">{devices.length}</strong>
          </span>
        </div>

        {/* Clock */}
        <div className="flex items-center space-x-1.5 text-slate-400 px-3 py-1.5 rounded-full bg-slate-900/60 border border-slate-800/80">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{currentTime}</span>
        </div>
      </div>

      {/* System Access Badge */}
      <div className="flex items-center space-x-3">
        {user && (
          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-slate-200 leading-none">{user.fullName || user.username}</div>
              <span
                className={`inline-block text-[10px] font-mono px-1.5 py-0.5 rounded border mt-1 ${getRoleBadgeColor(
                  user.role
                )}`}
              >
                ACCESO DIRECTO
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs">
              <Shield className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
