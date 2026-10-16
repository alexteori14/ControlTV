import React, { useState, useEffect } from 'react';
import { discoveryApi } from '../services/api.js';
import { DiscoveredDevice } from '../types/index.js';
import { useDevices } from '../context/DeviceContext.js';
import {
  Radar,
  Search,
  Plus,
  Tv,
  CheckCircle2,
  RefreshCw,
  Cpu,
} from 'lucide-react';

export const NetworkScanner: React.FC = () => {
  const { refreshDevices } = useDevices();
  const [subnet, setSubnet] = useState('192.168.1.0/24');
  const [subnetsList, setSubnetsList] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);
  const [importingIp, setImportingIp] = useState<string | null>(null);
  const [importedIps, setImportedIps] = useState<Set<string>>(new Set());

  useEffect(() => {
    discoveryApi.getSubnets().then((subs) => {
      setSubnetsList(subs);
      if (subs.length > 0) setSubnet(subs[0]);
    });

    discoveryApi.getStatus().then((status) => {
      setIsScanning(status.isScanning);
      setProgress(status.progress);
      setDiscoveredDevices(status.devices);
    });
  }, []);

  // Poll scan status while scanning
  useEffect(() => {
    let timer: any;
    if (isScanning) {
      timer = setInterval(async () => {
        const status = await discoveryApi.getStatus();
        setProgress(status.progress);
        setDiscoveredDevices(status.devices);
        if (!status.isScanning) {
          setIsScanning(false);
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isScanning]);

  const handleStartScan = async () => {
    setIsScanning(true);
    setProgress(0);
    setDiscoveredDevices([]);
    await discoveryApi.startScan(subnet);
  };

  const handleImport = async (device: DiscoveredDevice) => {
    try {
      setImportingIp(device.ip);
      await discoveryApi.importDevice(device);
      setImportedIps((prev) => new Set([...prev, device.ip]));
      await refreshDevices();
    } catch (err) {
      console.error('Error importing device:', err);
    } finally {
      setImportingIp(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Scan Config */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
              <Radar className={`w-6 h-6 ${isScanning ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Descubrimiento Automático en Red Local
              </h3>
              <p className="text-xs text-slate-400">
                Escaneo de protocolos Smart TV (PJLink, Samsung MDC, LG webOS, Sony REST, Telnet, SNMP)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <div className="flex-1 sm:w-56">
              <input
                type="text"
                value={subnet}
                onChange={(e) => setSubnet(e.target.value)}
                placeholder="192.168.1.0/24"
                className="w-full bg-slate-950 border border-slate-700 text-xs font-mono text-slate-200 rounded-lg px-3 py-2 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <button
              onClick={handleStartScan}
              disabled={isScanning}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white font-medium text-xs flex items-center space-x-2 shadow-lg shadow-cyan-600/30 transition-all flex-shrink-0"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Escaneando...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Escanear Red</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Subnet quick chips */}
        {subnetsList.length > 0 && (
          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className="text-slate-500">Subredes locales detectadas:</span>
            {subnetsList.map((s) => (
              <button
                key={s}
                onClick={() => setSubnet(s)}
                className={`px-2 py-0.5 rounded border transition-colors ${
                  subnet === s
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Progress Bar */}
        {isScanning && (
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs font-mono text-slate-400">
              <span>Probing puertos Smart TV (4352, 1515, 9761, 8001, 80, 23)...</span>
              <span className="text-cyan-400 font-bold">{progress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Discovered Devices Table */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Tv className="w-4 h-4 text-cyan-400" />
            <h4 className="text-sm font-bold text-slate-100">
              Dispositivos Compatibles Detectados ({discoveredDevices.length})
            </h4>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Detección por fingerprint de puertos abiertos y respuestas de red
          </span>
        </div>

        {discoveredDevices.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Radar className="w-10 h-10 text-slate-700 mx-auto" />
            <div className="text-sm text-slate-400 font-medium">No hay dispositivos en la lista actual</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Presiona "Escanear Red" para descubrir automáticamente Smart TVs y pantallas Digital Signage conectadas a tu red local.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Dirección IP</th>
                  <th className="py-3 px-4">MAC Address</th>
                  <th className="py-3 px-4">Fabricante / Marca</th>
                  <th className="py-3 px-4">Hostname</th>
                  <th className="py-3 px-4">Protocolos Abiertos</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {discoveredDevices.map((item) => {
                  const isImported = importedIps.has(item.ip);
                  const isPending = importingIp === item.ip;

                  return (
                    <tr key={item.ip} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-200">{item.ip}</td>
                      <td className="py-3.5 px-4 text-slate-400">{item.macAddress}</td>
                      <td className="py-3.5 px-4">
                        <span className="text-cyan-400 font-semibold">{item.manufacturer}</span>
                        {item.suggestedModel && (
                          <div className="text-[10px] text-slate-500">{item.suggestedModel}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 truncate max-w-[150px]">
                        {item.hostname || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {item.responsiveProtocols.map((p) => (
                            <span
                              key={p}
                              className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-300"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isImported ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Registrado</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleImport(item)}
                            disabled={isPending}
                            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-sans font-medium inline-flex items-center space-x-1 shadow-sm transition-all"
                          >
                            <Plus className="w-3 h-3" />
                            <span>{isPending ? 'Importando...' : 'Importar'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
