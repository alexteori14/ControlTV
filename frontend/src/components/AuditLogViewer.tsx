import React, { useState, useEffect } from 'react';
import { auditApi } from '../services/api.js';
import { AuditLogEntry, CommandHistoryEntry } from '../types/index.js';
import { History, Shield, CheckCircle2, XCircle, Search, RefreshCw, Terminal } from 'lucide-react';

export const AuditLogViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'audit' | 'commands'>('audit');
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [commandHistory, setCommandHistory] = useState<CommandHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'audit') {
        const logs = await auditApi.getLogs();
        setAuditLogs(logs);
      } else {
        const history = await auditApi.getCommandHistory();
        setCommandHistory(history);
      }
    } catch (err) {
      console.error('Error loading audit data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const filteredLogs = auditLogs.filter(
    (l) =>
      l.username.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      (l.deviceName && l.deviceName.toLowerCase().includes(search.toLowerCase())) ||
      (l.details && l.details.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredHistory = commandHistory.filter(
    (c) =>
      c.username.toLowerCase().includes(search.toLowerCase()) ||
      c.command.toLowerCase().includes(search.toLowerCase()) ||
      c.deviceName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-800/40 text-cyan-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Seguridad, Auditoría & Trazabilidad de Comandos
            </h3>
            <p className="text-xs text-slate-400">
              Historial inmutable de acciones de usuarios y comandos de red despachados
            </p>
          </div>
        </div>

        {/* Tab Buttons & Search */}
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="flex rounded-lg bg-slate-950 border border-slate-800 p-1 text-xs font-mono">
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'audit'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Auditoría General
            </button>
            <button
              onClick={() => setActiveTab('commands')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'commands'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Historial de Comandos
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 w-36 sm:w-48"
            />
          </div>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
        {activeTab === 'audit' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Fecha / Hora</th>
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4">Acción</th>
                  <th className="py-3 px-4">Dispositivo</th>
                  <th className="py-3 px-4">Detalles</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">IP Origen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-200">{log.username}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300 text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{log.deviceName || 'N/A'}</td>
                    <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{log.details || '-'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center space-x-1 ${
                          log.status === 'SUCCESS' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {log.status === 'SUCCESS' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        <span>{log.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{log.ipAddress || '127.0.0.1'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Fecha / Hora</th>
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4">Pantalla</th>
                  <th className="py-3 px-4">Comando</th>
                  <th className="py-3 px-4">Parámetros</th>
                  <th className="py-3 px-4">Tiempo (ms)</th>
                  <th className="py-3 px-4">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredHistory.map((cmd) => (
                  <tr key={cmd.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(cmd.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-200">{cmd.username}</td>
                    <td className="py-3 px-4 text-slate-300">{cmd.deviceName}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-cyan-400">{cmd.command}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[10px] max-w-xs truncate">
                      {cmd.params || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{cmd.executionTimeMs} ms</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center space-x-1 ${
                          cmd.resultStatus === 'SUCCESS' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {cmd.resultStatus === 'SUCCESS' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        <span>{cmd.resultMessage || cmd.resultStatus}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
