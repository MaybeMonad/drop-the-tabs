import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import '@/style.css';
import { usePairing } from '../../hooks/usePairing';

// QR Code display component
function QRCodeDisplay({ data, size = 256 }: { data: string; size?: number }) {
  // Simple QR-like visual representation
  // In production, use a real QR code library like qrcode.react
  return (
    <div 
      className="bg-white p-4 rounded-lg inline-block"
      style={{ width: size, height: size }}
    >
      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-2">📱</div>
          <div className="text-xs text-gray-500 font-mono break-all px-2">
            {data.slice(0, 50)}...
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

// Pairing Section
function PairingSection() {
  const [deviceId, setDeviceId] = useState('');
  
  useEffect(() => {
    // Get device ID from storage
    chrome.storage.local.get('device_id').then((result) => {
      if (result.device_id) {
        setDeviceId(result.device_id);
      } else {
        // Generate new device ID
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
    generate, 
    cancel 
  } = usePairing({ deviceId });

  return (
    <section className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        🔗 Device Pairing
      </h2>
      
      <div className="space-y-4">
        {state.type === 'idle' && (
          <div className="text-center py-4">
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
    </section>
  );
}

// Main Options Component
function Options() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">📑 Drop The Tabs</h1>
          <p className="text-gray-600 mt-1">Settings and Device Management</p>
        </header>
        
        <div className="space-y-6">
          <PairingSection />
          
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
            <h2 className="text-xl font-semibold mb-4">☁️ Sync Backend</h2>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                <input type="radio" name="backend" value="firebase" defaultChecked className="w-5 h-5" />
                <div>
                  <p className="font-medium">Firebase (Cloud)</p>
                  <p className="text-sm text-gray-500">Managed, always available</p>
                </div>
              </label>
              
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                <input type="radio" name="backend" value="custom" className="w-5 h-5" />
                <div className="flex-1">
                  <p className="font-medium">Self-Hosted</p>
                  <p className="text-sm text-gray-500">Your own server</p>
                </div>
              </label>
              
              <input
                type="text"
                placeholder="ws://localhost:3000/ws"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
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
