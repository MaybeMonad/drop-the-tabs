import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/style.css';

// Simple options page for now
function Options() {
  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">📑 Drop The Tabs - Settings</h1>
      
      <div className="space-y-6">
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Auto Grouping</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="w-5 h-5" />
              <span>Automatically group new tabs</span>
            </label>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Smart Reminders</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="w-5 h-5" />
              <span>Remind me when I have too many tabs open</span>
            </label>
            <div className="ml-8">
              <label className="block text-sm text-gray-600 mb-1">
                Tab threshold: 15 tabs
              </label>
              <input type="range" min="5" max="50" defaultValue="15" className="w-full" />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Data Export</h2>
          <p className="text-gray-600 mb-4">Your data is stored locally. You can export it anytime from the popup.</p>
          
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            Clear All Data
          </button>
        </section>
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
