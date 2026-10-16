import React from 'react';
import { FileText, Database, Shield, Server, Terminal, CheckCircle2 } from 'lucide-react';

export const DocsGuide: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
        <div className="flex items-center space-x-2 text-cyan-400">
          <FileText className="w-5 h-5" />
          <h3 className="text-base font-bold text-slate-100">
            Documentación Técnica de Arquitectura & Entregables
          </h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Diseño integral de la plataforma de control y monitoreo remoto de pantallas Smart TV y Digital Signage por IP.
        </p>
      </div>

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Architecture */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 text-cyan-400">
            <Server className="w-4 h-4" />
            <h4 className="text-sm font-bold text-slate-100 uppercase font-mono">1. Arquitectura del Sistema</h4>
          </div>
          <ul className="text-xs text-slate-300 space-y-1.5 font-mono">
            <li>• <strong>Frontend:</strong> React 19 + TypeScript + Tailwind CSS v4 + Material UI + Recharts + Socket.io-client.</li>
            <li>• <strong>Backend:</strong> Node.js (v24) + Express + TypeScript + Socket.IO hub + TCP Raw Sockets + WoL.</li>
            <li>• <strong>Dual-Engine DB:</strong> PostgreSQL nativo con auto-fallback a SQLite WAL para ejecución inmediata.</li>
            <li>• <strong>Capas:</strong> Controladores, Servicios, Repositorio BD, y Protocol Drivers (Factory Pattern).</li>
          </ul>
        </div>

        {/* Database */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 text-emerald-400">
            <Database className="w-4 h-4" />
            <h4 className="text-sm font-bold text-slate-100 uppercase font-mono">2. Modelo de Base de Datos</h4>
          </div>
          <ul className="text-xs text-slate-300 space-y-1.5 font-mono">
            <li>• <code className="text-cyan-300">users</code>: Cuentas, contraseñas hasheadas (bcrypt) y roles (Admin, Supervisor, Operador).</li>
            <li>• <code className="text-cyan-300">devices</code>: Registro IP, puerto, MAC, marca, modelo, estado, volumen, brillo, entrada, telemetría.</li>
            <li>• <code className="text-cyan-300">audit_logs</code>: Trazabilidad completa de inicios de sesión y cambios de configuración.</li>
            <li>• <code className="text-cyan-300">command_history</code>: Tiempos de respuesta (ms) y resultados de comandos por red.</li>
            <li>• <code className="text-cyan-300">telemetry</code>: Series temporales de temperatura y latencia para gráficas en tiempo real.</li>
          </ul>
        </div>

        {/* Protocols Supported */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 text-amber-400">
            <Terminal className="w-4 h-4" />
            <h4 className="text-sm font-bold text-slate-100 uppercase font-mono">3. Protocolos de Red Implementados</h4>
          </div>
          <ul className="text-xs text-slate-300 space-y-1.5 font-mono">
            <li>• <strong>PJLink (Puerto 4352):</strong> Estándar comercial (%1POWR, %1INPT, %1AVMT).</li>
            <li>• <strong>Samsung MDC:</strong> Trama binaria RS232-over-IP (0xAA Header + Checksum) y Tizen REST.</li>
            <li>• <strong>LG SuperSign & webOS:</strong> RS232-over-IP (puerto 9761, ka 01 01) y SSAP WebSocket.</li>
            <li>• <strong>Sony BRAVIA:</strong> REST API JSON-RPC con cabecera X-Auth-PSK.</li>
            <li>• <strong>Telnet / TCP Genérico:</strong> Sockets directos con terminador \r\n.</li>
            <li>• <strong>Wake-on-LAN:</strong> Magic packet UDP a la MAC address para encendido en frío.</li>
            <li>• <strong>SNMP / REST Genérico:</strong> Consultas OID y endpoints JSON HTTP.</li>
          </ul>
        </div>

        {/* Security & RBAC */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 text-rose-400">
            <Shield className="w-4 h-4" />
            <h4 className="text-sm font-bold text-slate-100 uppercase font-mono">4. Matriz de Roles & Seguridad</h4>
          </div>
          <div className="text-xs font-mono space-y-2 text-slate-300">
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-rose-400 font-bold">ADMIN:</span> Acceso total, gestión de usuarios, edición/eliminación de pantallas y auditoría.
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-amber-400 font-bold">SUPERVISOR:</span> Registro/edición de pantallas, envío de comandos y auditoría.
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-cyan-400 font-bold">OPERADOR:</span> Control remoto, monitoreo en vivo y visualización de pantalla.
            </div>
          </div>
        </div>
      </div>

      {/* Deployment & Testing Strategy */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <h4 className="text-sm font-bold text-slate-100 uppercase font-mono text-cyan-400">
          5. Despliegue con Docker y Plan de Pruebas
        </h4>
        <p className="text-xs text-slate-400 leading-relaxed font-mono">
          El proyecto incluye <code className="text-slate-200">docker-compose.yml</code> con PostgreSQL 16 y servicios de Backend y Frontend listos para producción con un solo comando:
        </p>
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-cyan-300">
          docker compose up --build -d
        </div>
        <p className="text-xs text-slate-400 font-mono">
          Adicionalmente, para desarrollo rápido sin contenedores, el backend detecta automáticamente el entorno y corre inmediatamente en SQLite integrado sin necesidad de instalar bases de datos externas.
        </p>
      </div>
    </div>
  );
};
