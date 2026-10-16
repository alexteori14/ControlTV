import React, { useState } from 'react';
import { useDevices } from '../context/DeviceContext.js';
import { Device, ConnectionType, ScreenStreamType } from '../types/index.js';
import { deviceApi } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import {
  Tv,
  Plus,
  Edit2,
  Trash2,
  Wifi,
  Search,
  CheckCircle2,
  XCircle,
  X,
  Radio,
} from 'lucide-react';

interface DeviceManagerProps {
  onOpenRemote: (device: Device) => void;
}

export const DeviceManager: React.FC<DeviceManagerProps> = ({ onOpenRemote }) => {
  const { devices, refreshDevices, pingDevice } = useDevices();
  const { hasRole } = useAuth();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [pingResults, setPingResults] = useState<Record<string, { ok: boolean; latency: number }>>({});
  const [isPinging, setIsPinging] = useState<Record<string, boolean>>({});

  // Form State
  const [formData, setFormData] = useState<Partial<Device>>({
    name: '',
    ip: '',
    port: 8001,
    macAddress: '',
    brand: 'Samsung',
    model: '',
    connectionType: 'WEBSOCKET',
    location: '',
    streamType: 'SIMULATED',
    streamUrl: '',
  });

  const canEdit = hasRole(['ADMIN', 'SUPERVISOR']);
  const canDelete = hasRole(['ADMIN']);

  const handleOpenCreate = () => {
    setEditingDevice(null);
    setFormData({
      name: '',
      ip: '',
      port: 8001,
      macAddress: '',
      brand: 'Samsung',
      model: '',
      connectionType: 'WEBSOCKET',
      location: '',
      streamType: 'SIMULATED',
      streamUrl: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (device: Device) => {
    setEditingDevice(device);
    setFormData({
      name: device.name,
      ip: device.ip,
      port: device.port,
      macAddress: device.macAddress || '',
      brand: device.brand,
      model: device.model,
      connectionType: device.connectionType,
      location: device.location || '',
      streamType: device.streamType,
      streamUrl: device.streamUrl || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDevice) {
        await deviceApi.update(editingDevice.id, formData);
      } else {
        await deviceApi.create(formData);
      }
      setIsModalOpen(false);
      await refreshDevices();
    } catch (err: any) {
      alert(`Error al guardar pantalla: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`¿Confirmas la eliminación permanente de la pantalla "${name}"?`)) {
      try {
        await deviceApi.delete(id);
        await refreshDevices();
      } catch (err: any) {
        alert(`Error al eliminar: ${err.message}`);
      }
    }
  };

  const handlePing = async (id: string) => {
    setIsPinging((prev) => ({ ...prev, [id]: true }));
    const start = Date.now();
    const ok = await pingDevice(id);
    const latency = Date.now() - start;
    setPingResults((prev) => ({ ...prev, [id]: { ok, latency } }));
    setIsPinging((prev) => ({ ...prev, [id]: false }));
  };

  const filtered = devices.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.ip.includes(search) ||
      d.brand.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
            <Tv className="w-5 h-5 text-cyan-400" />
            <span>Gestión de Pantallas & Dispositivos ({devices.length})</span>
          </h3>
          <p className="text-xs text-slate-400">
            Registro, configuración de protocolos y mantenimiento de Smart TVs
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filtrar por nombre o IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {canEdit && (
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center space-x-1.5 shadow-lg shadow-cyan-600/30 transition-all flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Pantalla</span>
            </button>
          )}
        </div>
      </div>

      {/* Devices Table */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Pantalla / Nombre</th>
                <th className="py-3 px-4">Dirección IP:Puerto</th>
                <th className="py-3 px-4">Marca / Modelo</th>
                <th className="py-3 px-4">Tipo Conexión</th>
                <th className="py-3 px-4">Ubicación</th>
                <th className="py-3 px-4">Estado / Enlace</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((d) => {
                const isOnline = d.status === 'ONLINE';
                const ping = pingResults[d.id];
                const isPingRunning = isPinging[d.id];

                return (
                  <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-200">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isOnline ? 'bg-emerald-400' : 'bg-rose-500'
                          }`}
                        />
                        <span>{d.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal">
                        MAC: {d.macAddress || 'No configurada'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {d.ip}:{d.port}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-cyan-400 font-semibold">{d.brand}</span>
                      <div className="text-[10px] text-slate-500">{d.model}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px]">
                        {d.connectionType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">{d.location || 'General'}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handlePing(d.id)}
                          disabled={isPingRunning}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-400 transition-colors"
                          title="Probar enlace"
                        >
                          <Wifi className={`w-3.5 h-3.5 ${isPingRunning ? 'animate-pulse text-cyan-400' : ''}`} />
                        </button>
                        {ping && (
                          <span
                            className={`text-[10px] flex items-center space-x-1 ${
                              ping.ok ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {ping.ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            <span>{ping.ok ? `${ping.latency}ms` : 'Sin enlace'}</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => onOpenRemote(d)}
                          className="p-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-400 border border-cyan-800/60 transition-colors"
                          title="Abrir Control Remoto"
                        >
                          <Radio className="w-3.5 h-3.5" />
                        </button>

                        {canEdit && (
                          <button
                            onClick={() => handleOpenEdit(d)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                            title="Editar configuración"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {canDelete && (
                          <button
                            onClick={() => handleDelete(d.id, d.name)}
                            className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 border border-rose-800/40 transition-colors"
                            title="Eliminar pantalla"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Register / Edit Screen */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                <Tv className="w-4 h-4 text-cyan-400" />
                <span>{editingDevice ? 'Editar Pantalla' : 'Registrar Nueva Pantalla'}</span>
              </h4>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400">Nombre de la Pantalla *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Sala de Control Principal"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400">Ubicación / Área</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Ej: Piso 2 - Sala A"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400">Dirección IP *</label>
                  <input
                    type="text"
                    required
                    value={formData.ip}
                    onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                    placeholder="192.168.1.100"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400">Puerto de Control *</label>
                  <input
                    type="number"
                    required
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                    placeholder="80, 4352, 1515, 9761..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                  {formData.brand === 'Samsung' && (
                    <span className="text-[10px] text-cyan-400 font-mono block">Puerto estándar: 8001 (Tizen Smart TV)</span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400">Marca / Fabricante *</label>
                  <select
                    value={formData.brand}
                    onChange={(e) => {
                      const b = e.target.value;
                      let p = formData.port;
                      let c = formData.connectionType;
                      if (b === 'Samsung') { p = 8001; c = 'WEBSOCKET'; }
                      else if (b === 'Panasonic') { p = 4352; c = 'PJLINK'; }
                      else if (b === 'LG') { p = 9761; c = 'HTTP'; }
                      setFormData({ ...formData, brand: b, port: p, connectionType: c });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="Samsung">Samsung (MDC / Tizen)</option>
                    <option value="LG">LG (SuperSign / webOS)</option>
                    <option value="Sony">Sony (BRAVIA Professional)</option>
                    <option value="Panasonic">Panasonic (PJLink Protocol)</option>
                    <option value="NEC">NEC / Sharp (Commercial)</option>
                    <option value="Virtual/Generic">Virtual / Emulador de Pruebas</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400">Modelo *</label>
                  <input
                    type="text"
                    required
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="Ej: Smart Signage QM85R"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400">Tipo de Conexión (Driver) *</label>
                  <select
                    value={formData.connectionType}
                    onChange={(e) => setFormData({ ...formData, connectionType: e.target.value as ConnectionType })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="HTTP">HTTP (API REST Estándar)</option>
                    <option value="HTTPS">HTTPS (Seguro)</option>
                    <option value="WEBSOCKET">WebSocket (webOS SSAP / Real-time)</option>
                    <option value="TELNET">Telnet / TCP RS232-over-IP</option>
                    <option value="REST_API">REST API (Sony Bravia / JSON-RPC)</option>
                    <option value="PJLINK">PJLink (Estándar Proyectores/Display - 4352)</option>
                    <option value="SNMP">SNMP (Monitoreo MIB)</option>
                    <option value="VIRTUAL">Virtual (Simulador Integrado)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400">MAC Address (Para Wake-on-LAN)</label>
                  <input
                    type="text"
                    value={formData.macAddress}
                    onChange={(e) => setFormData({ ...formData, macAddress: e.target.value })}
                    placeholder="00:1A:E8:4A:BC:11"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <label className="text-slate-400">Tipo de Transmisión de Pantalla</label>
                <select
                  value={formData.streamType}
                  onChange={(e) => setFormData({ ...formData, streamType: e.target.value as ScreenStreamType })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="SIMULATED">Simulado (Patrón de prueba Digital Signage)</option>
                  <option value="SCREEN_CAPTURE">Screen Capture API (Capturadora HDMI USB / PC)</option>
                  <option value="RTSP">RTSP (URL de flujo H.264 directo)</option>
                  <option value="WEBRTC">WebRTC (Peer-to-Peer)</option>
                  <option value="NONE">Sin vista previa</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium shadow-md shadow-cyan-600/30"
                >
                  Guardar Dispositivo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
