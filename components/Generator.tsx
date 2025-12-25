
import React, { useState, useRef, useEffect } from 'react';
import { generateDesignWithFallback } from '../services/aiService';
import { enhancePrompt } from '../services/gemini';
import { getStyles } from '../services/storage';
import { Loader2, Sparkles, AlertCircle, RefreshCw, Wand2, History, Upload, X, Edit, Cpu, Activity, AlertTriangle } from 'lucide-react';

interface GeneratorProps {
  onImageGenerated: (url: string) => void;
  gallery: string[];
  onSelectFromGallery: (url: string) => void;
}

const Generator: React.FC<GeneratorProps> = ({ onImageGenerated, gallery, onSelectFromGallery }) => {
  const [prompt, setPrompt] = useState('');
  const [styles, setStyles] = useState<string[]>([]);
  const [style, setStyle] = useState('');
  const [loading, setLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerUsed, setProviderUsed] = useState<string | null>(null);

  // Settings - Default set to Gemini as requested
  const [selectedModel, setSelectedModel] = useState<'auto' | 'gemini' | 'stability' | 'dalle' | 'huggingface' | 'pollinations'>('gemini');
  const [usageCount, setUsageCount] = useState(0);

  // Reference Image State
  const [refImage, setRefImage] = useState<string | null>(null);
  const [refImageBase64, setRefImageBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadStyles = async () => {
      const loadedStyles = await getStyles();
      setStyles(loadedStyles);
      if (loadedStyles.length > 0) setStyle(loadedStyles[0]);
    };
    loadStyles();

    // Load session usage
    const savedUsage = sessionStorage.getItem('pod_usage_count');
    if (savedUsage) setUsageCount(parseInt(savedUsage));
  }, []);

  const handleEnhance = async () => {
    if (!prompt.trim()) return;
    setEnhancing(true);
    setError(null);
    try {
      const betterPrompt = await enhancePrompt(prompt, style);
      setPrompt(betterPrompt);
    } catch (e: any) {
      console.error(e);
      let msg = "Enhancement failed: ";
      if (e.message && e.message.includes("API Key")) msg += "Gemini API Key missing. Set it in Admin.";
      else msg += e.message || "Unknown error";
      setError(msg);
    } finally {
      setEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !refImageBase64) return;
    setLoading(true);
    setError(null);
    setProviderUsed(null);

    try {
      const effectivePrompt = prompt || "A high quality design";

      const result = await generateDesignWithFallback(
        effectivePrompt,
        style,
        refImageBase64 || undefined,
        selectedModel
      );

      // Update Usage
      const newCount = usageCount + 1;
      setUsageCount(newCount);
      sessionStorage.setItem('pod_usage_count', newCount.toString());
      setProviderUsed(result.provider);

      // Verify image data before passing
      if (!result.url || !result.url.startsWith('data:image')) {
        throw new Error("Received invalid image data.");
      }

      onImageGenerated(result.url);
    } catch (err: any) {
      console.error(err);
      let msg = "Failed to generate. ";
      if (err.message.includes("API key missing")) msg += "Please configure API keys in Admin.";
      else if (err.message.includes("429") || err.message.includes("Quota")) msg += "Quota exceeded. The fallback system tried but no alternative keys were available.";
      else msg += err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setRefImage(url);

      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setRefImageBase64(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearRefImage = () => {
    setRefImage(null);
    setRefImageBase64(null);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-full max-h-[85vh]">
      {/* Sidebar Gallery */}
      {gallery.length > 0 && (
        <div className="hidden lg:flex flex-col w-48 shrink-0 bg-zinc-900 rounded-2xl border border-zinc-800 p-4 overflow-hidden">
          <h3 className="text-sm font-bold text-zinc-400 mb-4 flex items-center gap-2"><History size={16} /> Recent</h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
            {gallery.map((url, i) => (
              <button
                key={i}
                onClick={() => onSelectFromGallery(url)}
                className="w-full aspect-square rounded-lg overflow-hidden border border-zinc-700 hover:border-indigo-500 transition-all relative group"
              >
                <img src={url} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="text-xs font-bold">Edit</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Generator */}
      <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full space-y-8 animate-fade-in">
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
            Create Your Next Bestseller
          </h2>
          <p className="text-zinc-400 text-lg">
            Describe your idea, choose a style, or transform your own photos.
          </p>

          {/* Status Bar */}
          <div className="flex items-center justify-center gap-4 text-xs font-medium text-zinc-500">
            <div className="flex items-center gap-1 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
              <Activity size={12} className="text-green-500" />
              <span>Session Usage: {usageCount}</span>
            </div>
            {providerUsed && (
              <div className="flex items-center gap-1 bg-indigo-900/20 px-3 py-1 rounded-full border border-indigo-500/30 text-indigo-300 animate-in fade-in">
                <Cpu size={12} />
                <span>Generated with {providerUsed}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl space-y-6">
          <div className="flex items-center justify-between p-2 bg-zinc-950 rounded-lg border border-zinc-800">
            <label className="text-xs font-bold text-zinc-400 pl-2">AI Model:</label>
            <div className="flex gap-2">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as any)}
                className="bg-zinc-900 border border-zinc-700 text-xs rounded px-2 py-1 outline-none focus:border-indigo-500"
              >
                <option value="gemini">Gemini 2.5 Flash (Fast Free)</option>
                <option value="auto">Auto (Best Free)</option>
                <option value="pollinations">Pollinations (Flux - No Key)</option>
                <option value="huggingface">Hugging Face (SDXL Free)</option>
                <option value="stability">Stability XL (Paid)</option>
                <option value="dalle">DALL-E 3 (Paid)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 relative">
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-medium text-zinc-300">Your Vision</label>
              <div className="flex gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`text-xs flex items-center gap-1 transition-colors ${refImage ? 'text-indigo-400 font-bold' : 'text-zinc-400 hover:text-white'}`}
                >
                  <Upload size={12} /> {refImage ? 'Change Image' : 'Upload Image'}
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUpload} />

                <button
                  onClick={handleEnhance}
                  disabled={enhancing || !prompt}
                  className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors"
                >
                  {enhancing ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                  {enhancing ? 'Enhancing...' : 'Enhance Prompt'}
                </button>
              </div>
            </div>

            {refImage && (
              <div className="relative w-full h-32 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden mb-2 group">
                <img src={refImage} className="w-full h-full object-contain opacity-70 group-hover:opacity-100 transition-opacity" />
                <div className="absolute top-2 right-2 flex gap-2">
                  <button onClick={clearRefImage} className="p-1.5 bg-black/60 text-white rounded-full hover:bg-red-600 transition-colors" title="Remove Image">
                    <X size={14} />
                  </button>
                </div>
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-indigo-600/90 text-white text-[10px] font-bold rounded uppercase tracking-wider">
                  Reference Image
                </div>
              </div>
            )}

            <textarea
              className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white placeholder-zinc-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none ${refImage ? 'h-20' : 'h-32'}`}
              placeholder={refImage ? "Describe how to transform this image (e.g. 'Make it look like a vintage comic book')..." : "E.g., A cute astronaut cat floating in space holding a pizza slice..."}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Art Style</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-32 overflow-y-auto scrollbar-thin">
              {styles.map((s) => (
                <button
                  key={s}
                  onClick={() => setStyle(s)}
                  className={`p-3 text-xs md:text-sm font-medium rounded-lg border transition-all ${style === s
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/20'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                    }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900/50 animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-semibold">Generation Failed</p>
                <p className="text-xs opacity-90">{error}</p>
                {error.includes("Access denied") && (
                  <button onClick={() => window.location.reload()} className="text-xs flex items-center gap-1 font-bold underline hover:text-white">
                    <RefreshCw size={12} /> Refresh Page
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            {refImage && (
              <button
                onClick={() => onImageGenerated(refImage)}
                className="flex-1 py-4 rounded-xl border border-zinc-700 text-zinc-300 font-bold hover:bg-zinc-800 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <Edit size={18} /> Edit Original
              </button>
            )}
            <button
              onClick={handleGenerate}
              disabled={loading || (!prompt && !refImage)}
              className={`flex-[2] py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${loading || (!prompt && !refImage)
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-900/20 transform hover:-translate-y-0.5'
                }`}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" /> {selectedModel === 'auto' ? 'Trying Providers...' : `Generating (${selectedModel})...`}
                </>
              ) : (
                <>
                  <Sparkles /> {refImage ? 'Stylize Image' : 'Generate Design'}
                </>
              )}
            </button>
          </div>

          {selectedModel === 'auto' && (
            <div className="text-[10px] text-zinc-500 text-center flex items-center justify-center gap-1">
              <AlertTriangle size={10} />
              Smart Fallback active: Trying Pollinations (No Key) first, then others.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Generator;
