
import React, { useState, useEffect } from 'react';
import {
  getStyles, addStyle, removeStyle,
  getMockups, addMockup, removeMockup,
  getTextures, addTexture, removeTexture,
  resetToDefaults, getApiKeys, saveApiKeys
} from '../services/storage';
import {
  LayoutDashboard, Palette, Shirt, Box, Settings,
  Trash2, Plus, LogOut, Upload, Link as LinkIcon, AlertTriangle, Key, Save, Loader2
} from 'lucide-react';

interface AdminPanelProps {
  onLogout: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onLogout }) => {
  const [tab, setTab] = useState<'styles' | 'mockups' | 'textures' | 'keys' | 'settings'>('styles');

  // Data State
  const [styles, setStyles] = useState<string[]>([]);
  const [mockups, setMockups] = useState<any>({});
  const [textures, setTextures] = useState<any[]>([]);
  const [apiKeys, setApiKeys] = useState<any>({ gemini: '', stability: '', openai: '', huggingface: '' });
  const [loading, setLoading] = useState(true);

  // Form State
  const [newStyle, setNewStyle] = useState('');
  const [newMockupUrl, setNewMockupUrl] = useState('');
  const [newMockupCat, setNewMockupCat] = useState('apparel');
  const [newTextureName, setNewTextureName] = useState('');
  const [newTextureUrl, setNewTextureUrl] = useState('');
  const [keysSaved, setKeysSaved] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setStyles(await getStyles());
    setMockups(await getMockups());
    setTextures(await getTextures());
    setApiKeys(await getApiKeys());
    setLoading(false);
  };

  const handleAddStyle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStyle) return;
    setStyles(await addStyle(newStyle));
    setNewStyle('');
  };

  const handleAddMockup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMockupUrl) return;
    setMockups(await addMockup(newMockupCat as any, newMockupUrl));
    setNewMockupUrl('');
  };

  const handleAddTexture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTextureName || !newTextureUrl) return;
    setTextures(await addTexture(newTextureName, newTextureUrl));
    setNewTextureName('');
    setNewTextureUrl('');
  };

  const handleSaveKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveApiKeys(apiKeys);
    setKeysSaved(true);
    setTimeout(() => setKeysSaved(false), 2000);
  };

  const handleReset = async () => {
    if (confirm("Reset all admin data to defaults? This cannot be undone.")) {
      await resetToDefaults();
      await loadData();
    }
  };

  const handleRemoveStyle = async (s: string) => {
    setStyles(await removeStyle(s));
  }

  const handleRemoveMockup = async (cat: any, url: string) => {
    setMockups(await removeMockup(cat, url));
  }

  const handleRemoveTexture = async (url: string) => {
    setTextures(await removeTexture(url));
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-900/50 p-6 flex flex-col overflow-y-auto">
        <div className="flex items-center gap-2 mb-8 shrink-0">
          <div className="w-8 h-8 rounded bg-red-600 flex items-center justify-center font-bold text-sm">ADM</div>
          <span className="font-bold tracking-tight">Admin<span className="text-zinc-500">Panel</span></span>
        </div>

        <nav className="space-y-1 flex-1">
          <button onClick={() => setTab('styles')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'styles' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}>
            <Palette size={18} /> Style Presets
          </button>
          <button onClick={() => setTab('mockups')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'mockups' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}>
            <Shirt size={18} /> Mockups
          </button>
          <button onClick={() => setTab('textures')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'textures' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}>
            <Box size={18} /> Textures
          </button>
          <button onClick={() => setTab('keys')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'keys' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}>
            <Key size={18} /> API Keys
          </button>
          <button onClick={() => setTab('settings')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'settings' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}>
            <Settings size={18} /> System
          </button>
        </nav>

        <button onClick={onLogout} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950/30 transition-colors shrink-0 mt-4">
          <LogOut size={18} /> Exit Admin
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <header className="mb-8 border-b border-zinc-800 pb-4">
          <h1 className="text-2xl font-bold capitalize">{tab} Management</h1>
          <p className="text-zinc-500 text-sm">Manage dynamic content and configurations.</p>
        </header>

        {tab === 'styles' && (
          <div className="space-y-6 max-w-3xl">
            <form onSubmit={handleAddStyle} className="flex gap-4 p-4 bg-zinc-900 rounded-xl border border-zinc-800">
              <input
                value={newStyle}
                onChange={e => setNewStyle(e.target.value)}
                placeholder="Enter new style name (e.g. 'Glitch Art')"
                className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2 outline-none focus:border-indigo-500"
              />
              <button type="submit" disabled={!newStyle} className="px-4 py-2 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 disabled:opacity-50">Add Preset</button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {styles.map(style => (
                <div key={style} className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-lg group">
                  <span className="font-medium text-zinc-300">{style}</span>
                  <button onClick={() => handleRemoveStyle(style)} className="text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'mockups' && (
          <div className="space-y-8">
            <form onSubmit={handleAddMockup} className="flex flex-col md:flex-row gap-4 p-4 bg-zinc-900 rounded-xl border border-zinc-800 max-w-4xl">
              <select value={newMockupCat} onChange={e => setNewMockupCat(e.target.value)} className="bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2">
                <option value="apparel">Apparel</option>
                <option value="home">Home</option>
                <option value="accessories">Accessories</option>
              </select>
              <input
                value={newMockupUrl}
                onChange={e => setNewMockupUrl(e.target.value)}
                placeholder="Image URL (https://...)"
                className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2 outline-none focus:border-indigo-500"
              />
              <button type="submit" disabled={!newMockupUrl} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-500 disabled:opacity-50">Add Mockup</button>
            </form>

            {Object.entries(mockups).map(([cat, urls]: [string, any]) => (
              <div key={cat} className="space-y-4">
                <h3 className="text-lg font-semibold capitalize text-zinc-400 border-b border-zinc-800 pb-2">{cat}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {urls.map((url: string, i: number) => (
                    <div key={i} className="aspect-square rounded-lg border border-zinc-800 overflow-hidden relative group">
                      <img src={url} className="w-full h-full object-cover" />
                      <button onClick={() => handleRemoveMockup(cat, url)} className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'textures' && (
          <div className="space-y-6 max-w-4xl">
            <form onSubmit={handleAddTexture} className="flex flex-col md:flex-row gap-4 p-4 bg-zinc-900 rounded-xl border border-zinc-800">
              <input
                value={newTextureName}
                onChange={e => setNewTextureName(e.target.value)}
                placeholder="Texture Name"
                className="w-48 bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2 outline-none focus:border-indigo-500"
              />
              <input
                value={newTextureUrl}
                onChange={e => setNewTextureUrl(e.target.value)}
                placeholder="Texture Image URL"
                className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2 outline-none focus:border-indigo-500"
              />
              <button type="submit" disabled={!newTextureUrl} className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-500 disabled:opacity-50">Add Texture</button>
            </form>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {textures.map((t, i) => (
                <div key={i} className="aspect-square bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex flex-col items-center gap-3 relative group">
                  <img src={t.url} className="w-full h-32 object-cover rounded bg-zinc-950" />
                  <span className="text-sm font-medium">{t.name}</span>
                  <button onClick={() => handleRemoveTexture(t.url)} className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'keys' && (
          <div className="space-y-6 max-w-2xl">
            <div className="p-4 bg-indigo-950/20 border border-indigo-900/50 rounded-xl">
              <h3 className="font-bold text-indigo-400 mb-2">API Configuration</h3>
              <p className="text-sm text-zinc-400">Configure connection keys for AI services. These are stored locally in your browser.</p>
            </div>

            <form onSubmit={handleSaveKeys} className="space-y-6 bg-zinc-900 p-6 rounded-xl border border-zinc-800">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Gemini API Key (Primary/Free Tier)</label>
                <div className="relative">
                  <input
                    type="password"
                    value={apiKeys.gemini}
                    onChange={e => setApiKeys({ ...apiKeys, gemini: e.target.value })}
                    placeholder="AIza..."
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  />
                  <Key className="absolute left-3 top-3.5 text-zinc-500" size={18} />
                </div>
                <p className="text-xs text-zinc-500">Google's Gemini 2.0 Flash is the default free model.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Hugging Face Access Token (Free Tier)</label>
                <div className="relative">
                  <input
                    type="password"
                    value={apiKeys.huggingface}
                    onChange={e => setApiKeys({ ...apiKeys, huggingface: e.target.value })}
                    placeholder="hf_..."
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 outline-none focus:border-indigo-500 transition-all"
                  />
                  <Key className="absolute left-3 top-3.5 text-zinc-500" size={18} />
                </div>
                <p className="text-xs text-zinc-500">Required for SDXL / Flux models via Hugging Face Inference API.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Stability AI Key (Paid)</label>
                <div className="relative">
                  <input
                    type="password"
                    value={apiKeys.stability}
                    onChange={e => setApiKeys({ ...apiKeys, stability: e.target.value })}
                    placeholder="sk-..."
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 outline-none focus:border-indigo-500 transition-all"
                  />
                  <Key className="absolute left-3 top-3.5 text-zinc-500" size={18} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">OpenAI API Key (Paid)</label>
                <div className="relative">
                  <input
                    type="password"
                    value={apiKeys.openai}
                    onChange={e => setApiKeys({ ...apiKeys, openai: e.target.value })}
                    placeholder="sk-..."
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 outline-none focus:border-indigo-500 transition-all"
                  />
                  <Key className="absolute left-3 top-3.5 text-zinc-500" size={18} />
                </div>
              </div>

              <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all">
                {keysSaved ? <span className="flex items-center gap-2"><div className="w-2 h-2 bg-white rounded-full animate-pulse"></div> Saved!</span> : <><Save size={18} /> Save API Keys</>}
              </button>
            </form>
          </div>
        )}

        {tab === 'settings' && (
          <div className="space-y-6 max-w-xl">
            <div className="p-6 bg-red-950/20 border border-red-900/50 rounded-xl space-y-4">
              <div className="flex items-center gap-3 text-red-400">
                <AlertTriangle size={24} />
                <h3 className="font-bold">Danger Zone</h3>
              </div>
              <p className="text-sm text-zinc-400">Resetting will clear all your custom styles, mockups, textures, and API keys, reverting the application to its factory defaults.</p>
              <button onClick={handleReset} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-sm">
                Reset Application Data
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;
