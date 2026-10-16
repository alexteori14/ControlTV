import React from 'react';
import { LayoutDashboard, Radio, Tv, Video, Radar, History, FileText } from 'lucide-react';

export type NavTab = 'dashboard' | 'remote' | 'devices' | 'stream' | 'discovery' | 'audit' | 'docs';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard NOC', icon: LayoutDashboard },
    { id: 'remote' as NavTab, label: 'Control & Vista Remota', icon: Tv },
    { id: 'devices' as NavTab, label: 'Gestión Pantallas', icon: Radio },
    { id: 'discovery' as NavTab, label: 'Escáner de Red', icon: Radar },
    { id: 'audit' as NavTab, label: 'Auditoría & Comandos', icon: History },
    { id: 'docs' as NavTab, label: 'Arquitectura & Info', icon: FileText },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col justify-between p-4 flex-shrink-0">
      <div className="space-y-6">
        <div>
          <div className="text-[11px] font-mono tracking-wider text-slate-500 uppercase px-3 mb-2">
            Módulos Principales
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id || (item.id === 'remote' && activeTab === 'stream');
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-950/80 to-blue-950/60 text-cyan-400 border border-cyan-800/60 shadow-lg shadow-cyan-950/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Industrial System Info Badge */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs font-mono">
          <div className="text-slate-400 font-semibold mb-1 flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            <span>PROTOCOLOS ACTIVOS</span>
          </div>
          <div className="text-[11px] text-slate-500 space-y-0.5">
            <div>• PJLink (TCP 4352)</div>
            <div>• Samsung MDC / Tizen</div>
            <div>• LG SuperSign / webOS</div>
            <div>• Sony BRAVIA REST</div>
            <div>• Telnet / SNMP / WoL</div>
          </div>
        </div>
      </div>

      <div className="text-center text-[11px] text-slate-600 font-mono py-2 border-t border-slate-900">
        ControlTV IoT Signage Suite
      </div>
    </aside>
  );
};
