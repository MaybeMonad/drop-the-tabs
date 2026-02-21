import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import '@/style.css';
import { usePairing } from '../../hooks/usePairing';
import { 
  BACKEND_CONFIGS, 
  loadBackendConfig, 
  saveBackendConfig, 
  getFirebaseUrl,
  type BackendConfig,
  type BackendType 
} from '../../config/backend';

// QR Code display component
function QRCodeDisplay({ data, size = 256 }: { data: string; size?: number }) {
  return (
    <div 
      className="bg-white p-4 rounded-lg inline-block"
      style={{ width: size, height: size }}
    >
      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-2">📱</div>
          <div className="text-xs text-gray-500 font-mono break-all px-2">
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
            className="w-12 h-14 bg-white border-2 border-gray-300 rounded-lg flex items-center justify-center text-2xl font-bold text-gray-800"
          >
            {digit}
          </div>
        ))}
      </div>
    </div>
  );
}

// Backend Configuration Section
function BackendConfigSection({ onConfigChange }: { onConfigChange: () => void }) {
  const [backendConfig, setBackendConfig] = useState<BackendConfig | null>(null);
  const [selectedType, setSelectedType] = useState<BackendType>('firebase');
  const [customUrl, setCustomUrl] = useState('');
  const [firebaseProjectId, setFirebaseProjectId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    loadBackendConfig().then(config => {
      setBackendConfig(config);
      setSelectedType(config.type);
      setCustomUrl(config.apiUrl);
      if (config.type === 'firebase') {
        const match = config.apiUrl.match(/us-central1-([^.]+)/);
        if (match) setFirebaseProjectId(match[1]);
      }
    });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      let newConfig: BackendConfig;

      if (selectedType === 'firebase') {
        newConfig = {
          ...BACKEND_CONFIGS.firebase,
          apiUrl: getFirebaseUrl(firebaseProjectId || undefined),
        };
      } else {
        newConfig = {
          ...BACKEND_CONFIGS[selectedType],
          apiUrl: customUrl,
          wsUrl: customUrl.replace('http', 'ws') + '/ws',
        };
      }

      await saveBackendConfig(newConfig);
      setBackendConfig(newConfig);
      setSaveMessage('Saved successfully!');
      onConfigChange();
    } catch (error) {
      setSaveMessage('Failed to save');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  return (
    <section className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        ☁️ Backend Configuration
      </h2>

      <div className="space-y-4">
        {/* Backend Type Selection */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Select Backend</p>
          
          {Object.entries(BACKEND_CONFIGS).map(([type, config]) => (
            <label 
              key={type}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                selectedType === type 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="backend"
                value={type}
                checked={selectedType === type}
                onChange={(e) => setSelectedType(e.target.value as BackendType)}
                className="w-4 h-4"
              />
              <div>
                <p className="font-medium">{config.name}</p>
                <p className="text-sm text-gray-500">{config.description}</p>
              </div>
            </label>
          ))}
        </div>

        {/* Firebase Project ID Input */}
        {selectedType === 'firebase' && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Firebase Project ID
            </label>
            <input
              type="text"
              value={firebaseProjectId}
              onChange={(e) => setFirebaseProjectId(e.target.value)}
              placeholder="your-project-id"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500">
              API URL will be: {getFirebaseUrl(firebaseProjectId || 'YOUR_PROJECT_ID')}
            </p>
          </div>
        )}

        {/* Custom URL Input */}
        {selectedType !== 'firebase' && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Server URL
            </label>
            <input
              type="text"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="http://localhost:3000"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Current Config Display */}
        {backendConfig && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Current:</strong> {backendConfig.name}
            </p>
            <p className="text-xs text-gray-500 font-mono mt-1">
              {backendConfig.apiUrl}
            </p>
          </div>
        )}

        {/* Save Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
          
          {saveMessage && (
            <span className={`text-sm ${saveMessage.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>
              {saveMessage}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

// Pairing Section
function PairingSection({ onConfigChange }: { onConfigChange: () => void }) {
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
  
  const { 
    state, 
    qrCode, 
    pairingCode, 
    backendConfig,
    generate, 
    cancel,
    refreshBackend
  } = usePairing({ deviceId });

  // Refresh backend config when section mounts
  useEffect(() => {
    refreshBackend();
  }, [refreshBackend]);

  return (
    <section className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        🔗 Device Pairing
      </h2>

      {!backendConfig ? (
        <div className="text-center py-4 text-gray-500">
          Loading backend configuration...
        </div>
      ) : (
        <div className="space-y-4">
          {state.type === 'idle' && (
            <div className="text-center py-4">
              <p className="text-gray-600 mb-2">
                Backend: <strong>{backendConfig.name}</strong>
              </p>
              <p className="text-sm text-gray-500 mb-4">
                {backendConfig.apiUrl}
              </p>
              <p className="text-gray-600 mb-4">
                Pair with your mobile device to sync tabs across devices.
              </p>
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
                <p className="text-sm text-gray-500 mb-4">
                  Waiting for mobile device to connect...
                </p>
                <button
                  onClick={cancel}
                  className="text-gray-600 hover:text-gray-800 underline"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {state.type === 'completed' && (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">✅</div>
              <p className="text-green-600 font-medium mb-2">Device paired successfully!</p>
              <button
                onClick={cancel}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Pair another device
              </button>
            </div>
          )}

          {state.type === 'error' && (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">❌</div>
              <p className="text-red-600 mb-4">{state.error}</p>
              <button
                onClick={generate}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// Main Options Component
function Options() {
  const [configKey, setConfigKey] = useState(0);

  const handleConfigChange = () => {
    setConfigKey(prev => prev + 1); // Force re-render of pairing section
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">📑 Drop The Tabs</h1>
          <p className="text-gray-600 mt-1">Settings and Device Management</p>
        </header>
        
        <div className="space-y-6">
          <BackendConfigSection onConfigChange={handleConfigChange} />
          
          <PairingSection key={configKey} onConfigChange={handleConfigChange} />
          
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
