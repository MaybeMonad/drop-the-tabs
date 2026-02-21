import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import '@/style.css';
import { usePairing } from '../../hooks/usePairing';
import { 
  BackendConfig, 
  BackendType, 
  BACKEND_CONFIGS, 
  loadBackendConfig, 
  saveBackendConfig,
  getFirebaseUrl 
} from '../../config/backend';

// Backend selector component
function BackendSelector({ 
  currentConfig, 
  onChange 
}: { 
  currentConfig: BackendConfig; 
  onChange: (config: BackendConfig) => void;
}) {
  const [customUrl, setCustomUrl] = useState(currentConfig.apiUrl);
  const [firebaseProjectId, setFirebaseProjectId] = useState('');

  useEffect(() => {
    // Extract project ID from current URL
    const match = currentConfig.apiUrl.match(/us-central1-([^.]+)/);
    if (match) {
      setFirebaseProjectId(match[1]);
    }
  }, [currentConfig.apiUrl]);

  const handleTypeChange = (type: BackendType) => {
    if (type === 'firebase') {
      onChange({
        ...BACKEND_CONFIGS.firebase,
        apiUrl: getFirebaseUrl(firebaseProjectId || 'drop-the-tabs-prod'),
      });
    } else {
      onChange(BACKEND_CONFIGS[type]);
    }
  };

  const handleCustomUrlChange = (url: string) => {
    setCustomUrl(url);
    onChange({
      ...currentConfig,
      apiUrl: url,
      wsUrl: url.replace(/^http/, 'ws') + '/ws',
    });
  };

  const handleFirebaseIdChange = (id: string) => {
    setFirebaseProjectId(id);
    onChange({
      ...currentConfig,
      apiUrl: getFirebaseUrl(id),
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {(Object.keys(BACKEND_CONFIGS) as BackendType[]).map((type) => (
          <label 
            key={type}
            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border-2 transition-colors ${
              currentConfig.type === type 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input 
              type="radio" 
              name="backend" 
              value={type}
              checked={currentConfig.type === type}
              onChange={() => handleTypeChange(type)}
              className="w-4 h-4"
            />
            <div className="flex-1">
              <p className="font-medium">{BACKEND_CONFIGS[type].name}</p>
              <p className="text-sm text-gray-500">{BACKEND_CONFIGS[type].description}</p>
            </div>
          </label>
        ))}
      </div>

      {currentConfig.type === 'firebase' && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Firebase Project ID
          </label>
          <input
            type="text"
            value={firebaseProjectId}
            onChange={(e) => handleFirebaseIdChange(e.target.value)}
            placeholder="your-project-id"
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Current URL: {currentConfig.apiUrl}
          </p>
        </div>
      )}

      {(currentConfig.type === 'custom' || currentConfig.type === 'docker') && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Server URL
          </label>
          <input
            type="text"
            value={customUrl}
            onChange={(e) => handleCustomUrlChange(e.target.value)}
            placeholder="http://localhost:3000"
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
      )}

      <button
        onClick={() => saveBackendConfig(currentConfig)}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
      >
        Save Backend Settings
      </button>
    </div>
  );
}

// QR Code display
function QRCodeDisplay({ data, size = 200 }: { data: string; size?: number }) {
  return (
    <div className="bg-white p-4 rounded-lg inline-block border">
      <div 
        className="flex items-center justify-center bg-gray-100 rounded"
        style={{ width: size, height: size }}
      >
        <div className="text-center p-4">
          <div className="text-4xl mb-2">📱</div>
          <div className="text-xs text-gray-500 font-mono break-all">
            {data.slice(0, 40)}...
          </div>
        </div>
      </div>
      <p className="text-xs text-center text-gray-500 mt-2">Scan with mobile app</p>
    </div>
  );
}

// Pairing Code display
function PairingCodeDisplay({ code }: { code: string }) {
  return (
    <div className="text-center">
      <p className="text-sm text-gray-600 mb-2">Or enter this code:</p>
      <div className="flex justify-center gap-2">
        {code.split('').map((digit, i) => (
          <div 
            key={i}
            className="w-10 h-12 bg-white border-2 border-gray-300 rounded-lg flex items-center justify-center text-xl font-bold"
          >
            {digit}
          </div>
        ))}
      </div>
    </div>
  );
}

// Pairing Section
function PairingSection({ backendConfig }: { backendConfig: BackendConfig }) {
  const [deviceId, setDeviceId] = useState('');
  
  useEffect(() => {
    chrome.storage.local.get('device_id').then((result) => {
      if (result.device_id) {
        setDeviceId(result.device_id);
      } else {
        const newId = `ext_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        chrome.storage.local.set({ device_id: newId });
        setDeviceId(newId);
      }
    });
  }, []);
  
  const { state, qrCode, pairingCode, generate, cancel, result } = usePairing({ 
    deviceId, 
    backendConfig 
  });

  return (
    <section className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">🔗 Device Pairing</h2>
      
      <div className="space-y-4">
        {state.type === 'idle' && (
          <div className="text-center py-4">
            <p className="text-gray-600 mb-4">Pair with your mobile device to sync tabs.</p>
            <button
              onClick={generate}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
            >
              Start Pairing
            </button>
          </div>
        )}

        {state.type === 'generating' && (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Generating pairing code...</p>
          </div>
        )}

        {(state.type === 'waiting' || state.type === 'pairing') && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6 items-center justify-center">
              {qrCode && <QRCodeDisplay data={qrCode} />}
              <div className="text-center">
                <div className="text-gray-400 mb-2">OR</div>
                {pairingCode && <PairingCodeDisplay code={pairingCode} />}
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-4">Waiting for mobile device...</p>
              <button onClick={cancel} className="text-gray-600 hover:text-gray-800 underline">
                Cancel
              </button>
            </div>
          </div>
        )}

        {result?.success && (
          <div className="text-center py-4">
            <div className="text-5xl mb-4">✅</div>
            <p className="text-green-600 font-medium mb-2">Device paired!</p>
            <button onClick={cancel} className="text-blue-600 hover:text-blue-800 underline">
              Pair another device
            </button>
          </div>
        )}

        {state.type === 'error' && (
          <div className="text-center py-4">
            <div className="text-5xl mb-4">❌</div>
            <p className="text-red-600 mb-4">{(state as any).error}</p>
            <button onClick={generate} className="bg-blue-600 text-white px-4 py-2 rounded-lg">
              Try Again
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

// Main Options Component
function Options() {
  const [backendConfig, setBackendConfig] = useState<BackendConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'pairing' | 'backend' | 'settings'>('pairing');

  useEffect(() => {
    loadBackendConfig().then(setBackendConfig);
  }, []);

  if (!backendConfig) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">📑 Drop The Tabs</h1>
          <p className="text-gray-600 mt-1">Settings and Device Management</p>
        </header>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'pairing', label: '🔗 Pairing' },
            { id: 'backend', label: '☁️ Backend' },
            { id: 'settings', label: '⚙️ Settings' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {activeTab === 'pairing' && (
            <PairingSection backendConfig={backendConfig} />
          )}

          {activeTab === 'backend' && (
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">☁️ Backend Configuration</h2>
              <BackendSelector 
                currentConfig={backendConfig} 
                onChange={setBackendConfig} 
              />
            </section>
          )}

          {activeTab === 'settings' && (
            <>
              <section className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">⚙️ General Settings</h2>
                
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">Auto Group Tabs</span>
                    <input type="checkbox" defaultChecked className="w-5 h-5" />
                  </label>
                  
                  <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">Smart Reminders</span>
                    <input type="checkbox" defaultChecked className="w-5 h-5" />
                  </label>
                </div>
              </section>

              <section className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4 text-red-600">⚠️ Danger Zone</h2>
                
                <button className="text-red-600 border border-red-600 px-4 py-2 rounded-lg hover:bg-red-50">
                  Clear All Local Data
                </button>
              </section>
            </>
          )}
        </div>

        <footer className="mt-8 text-center text-sm text-gray-500">
          <p>Drop The Tabs v0.2.0 • MIT License</p>
        </footer>
      </div>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <Options />
    </React.StrictMode>
  );
}
