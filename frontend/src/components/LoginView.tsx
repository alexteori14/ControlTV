import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Monitor, Lock, User, Shield, AlertCircle, ArrowRight } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const success = await login(username, password);
    setLoading(false);

    if (!success) {
      setError('Credenciales inválidas o usuario inactivo.');
    }
  };

  const setDemoUser = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
  };

  return (
    <div className="min-h-screen bg-[#080c14] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10 backdrop-blur-xl">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-cyan-500/30">
            <Monitor className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-100 tracking-wide">ControlTV NOC</h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Plataforma de Control & Monitoreo Digital Signage
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-mono flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          <div className="space-y-1.5">
            <label className="text-slate-400 font-semibold">Usuario de Operaciones</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nombre de usuario"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-400 font-semibold">Contraseña de Seguridad</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs font-sans flex items-center justify-center space-x-2 shadow-lg shadow-cyan-600/30 transition-all mt-6"
          >
            <span>{loading ? 'Verificando credenciales...' : 'Ingresar al Centro de Control'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Role Selector */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
          <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-2">
            Perfiles de Prueba Rápidos (RBAC)
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
            <button
              onClick={() => setDemoUser('admin', 'admin123')}
              className="p-2 rounded bg-slate-950 border border-slate-800 hover:border-cyan-600 text-slate-300 transition-colors"
            >
              <div className="font-bold text-rose-400">ADMIN</div>
              <div className="text-slate-500">admin / 123</div>
            </button>
            <button
              onClick={() => setDemoUser('supervisor', 'super123')}
              className="p-2 rounded bg-slate-950 border border-slate-800 hover:border-cyan-600 text-slate-300 transition-colors"
            >
              <div className="font-bold text-amber-400">SUPERVISOR</div>
              <div className="text-slate-500">super / 123</div>
            </button>
            <button
              onClick={() => setDemoUser('operator', 'oper123')}
              className="p-2 rounded bg-slate-950 border border-slate-800 hover:border-cyan-600 text-slate-300 transition-colors"
            >
              <div className="font-bold text-cyan-400">OPERADOR</div>
              <div className="text-slate-500">oper / 123</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
