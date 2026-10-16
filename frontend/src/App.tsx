import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { DeviceProvider, useDevices } from './context/DeviceContext.js';
import { Navbar } from './components/Navbar.js';
import { Sidebar, NavTab } from './components/Sidebar.js';
import { IndustrialDashboard } from './components/IndustrialDashboard.js';
import { UnifiedRemoteScreen } from './components/UnifiedRemoteScreen.js';
import { DeviceManager } from './components/DeviceManager.js';
import { NetworkScanner } from './components/NetworkScanner.js';
import { AuditLogViewer } from './components/AuditLogViewer.js';
import { DocsGuide } from './components/DocsGuide.js';
import { LoginView } from './components/LoginView.js';
import { Device } from './types/index.js';

const MainApp: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { devices } = useDevices();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [activeRemoteDevice, setActiveRemoteDevice] = useState<Device | null>(null);

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const handleOpenRemote = (device: Device) => {
    setActiveRemoteDevice(device);
    setActiveTab('remote');
  };

  const handleOpenStream = (device: Device) => {
    setActiveRemoteDevice(device);
    setActiveTab('remote');
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans">
      {/* Top Industrial Navbar */}
      <Navbar />

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-[#0b0f19] to-[#090d16]">
          {activeTab === 'dashboard' && (
            <IndustrialDashboard
              onOpenRemote={handleOpenRemote}
              onOpenStream={handleOpenStream}
            />
          )}

          {(activeTab === 'remote' || activeTab === 'stream') && (
            <UnifiedRemoteScreen initialDevice={activeRemoteDevice || (devices.length > 0 ? devices[0] : null)} />
          )}

          {activeTab === 'devices' && <DeviceManager onOpenRemote={handleOpenRemote} />}

          {activeTab === 'discovery' && <NetworkScanner />}

          {activeTab === 'audit' && <AuditLogViewer />}

          {activeTab === 'docs' && <DocsGuide />}
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <DeviceProvider>
        <MainApp />
      </DeviceProvider>
    </AuthProvider>
  );
}

export default App;
