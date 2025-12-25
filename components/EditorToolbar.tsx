
import React, { useState, useRef, useEffect } from 'react';
import { EditorState, EditorTool, RGB, FONTS, Layer, TextLayer, PRINT_PRESETS, PreFlightResult } from '../types';
import { getTextures } from '../services/storage';
import { analyzePrintQuality, autoOptimizeContrast, getSpotColors } from '../utils/printUtils';
import { Wand2, Palette, Eraser, Pipette, RotateCcw, Type, Trash2, Plus, ArrowRight, Sliders, Sun, Contrast, Droplets, Zap, Sparkles, Image as ImageIcon, Upload, Circle, CaseUpper, Spline, CircleDashed, Sticker, Grip, Brush, Loader2, Printer, AlertTriangle, CheckCircle, Eye, EyeOff, LayoutTemplate } from 'lucide-react';

interface EditorToolbarProps {
  state: EditorState;
  updateState: (s: Partial<EditorState>) => void;
  activeTool: EditorTool;
  setActiveTool: (t: EditorTool) => void;
  onReset: () => void;
  onComplete: () => void;
  onBack: () => void;
  onGenerativeFill?: (prompt: string) => Promise<string>;
  getCanvas?: () => HTMLCanvasElement | null;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  state, updateState, activeTool, setActiveTool, onReset, onComplete, onBack, onGenerativeFill, getCanvas
}) => {
  const [activeTab, setActiveTab] = useState<'image' | 'layers' | 'effects' | 'print'>('image');
  const [newText, setNewText] = useState('POD DESIGN');
  const [genFillPrompt, setGenFillPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedLayerId, setExpandedLayerId] = useState<string | null>(null);
  const [textures, setTextures] = useState<any[]>([]);
  const [preFlight, setPreFlight] = useState<PreFlightResult | null>(null);
  const [spotColors, setSpotColors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      setTextures(await getTextures());
    })();
  }, []);

  const addTextLayer = () => {
    const newLayer: TextLayer = {
      id: Date.now().toString(),
      type: 'text',
      text: newText,
      fontFamily: FONTS[1].family,
      color: '#ffffff',
      size: 100,
      x: 50,
      y: 50,
      strokeColor: '#000000',
      strokeWidth: 0,
      shadowColor: '#000000',
      shadowBlur: 0,
      shadowOffsetX: 5,
      shadowOffsetY: 5,
      curvature: 0,
      letterSpacing: 0
    };
    updateState({ layers: [...state.layers, newLayer] });
    setExpandedLayerId(newLayer.id);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      addLayer(url);
    }
  };

  const addLayer = (url: string) => {
    updateState({
      layers: [...state.layers, {
        id: Date.now().toString(),
        type: 'image',
        url,
        x: 50,
        y: 50,
        scale: 30,
        rotation: 0
      }]
    });
  };

  const updateLayer = (id: string, updates: any) => {
    updateState({
      layers: state.layers.map(l => l.id === id ? { ...l, ...updates } : l)
    });
  };

  const updateFilter = (key: keyof typeof state.filters, value: number) => {
    updateState({
      filters: { ...state.filters, [key]: value }
    });
  };

  const handleGenFill = async () => {
    if (!onGenerativeFill || !genFillPrompt.trim()) return;
    setIsGenerating(true);
    try {
      await onGenerativeFill(genFillPrompt);
      setGenFillPrompt('');
      setActiveTool(EditorTool.NONE);
    } catch (e) {
      console.error(e);
      alert("Failed to generate. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const runPreFlight = () => {
    if (getCanvas) {
      const canvas = getCanvas();
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const result = analyzePrintQuality(ctx, canvas.width, canvas.height, state.fabricColor);
          setPreFlight(result);
          const colors = getSpotColors(ctx);
          setSpotColors(colors);
        }
      }
    }
  };

  const handleAutoContrast = () => {
    if (getCanvas) {
      const canvas = getCanvas();
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          autoOptimizeContrast(ctx, state.fabricColor);
          // Trigger re-render in parent is hard without state change, 
          // but changing filter slightly forces re-render usually. 
          // Better: we assume Editor manages canvas, so strictly speaking
          // we should probably pass a "trigger" prop or manage brightness via state.
          // For now, let's bump a filter slightly to force update if needed, 
          // but actual pixel manipulation happens in canvas directly.
          updateState({ filters: { ...state.filters, brightness: state.filters.brightness + 1 } });
          setTimeout(() => updateState({ filters: { ...state.filters, brightness: state.filters.brightness - 1 } }), 100);
        }
      }
    }
  };

  return (
    <div className="w-full lg:w-96 flex flex-col gap-6 bg-zinc-900 p-6 border-l border-zinc-800 lg:h-full overflow-y-auto z-10">
      <div className="flex justify-between items-center shrink-0">
        <h3 className="text-xl font-bold">Studio Editor</h3>
        <button onClick={onReset} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1">
          <RotateCcw size={14} /> Reset
        </button>
      </div>

      <div className="flex gap-2 p-1 bg-zinc-950 rounded-lg border border-zinc-800 shrink-0">
        <button onClick={() => setActiveTab('image')} className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${activeTab === 'image' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Tools</button>
        <button onClick={() => setActiveTab('effects')} className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${activeTab === 'effects' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>FX</button>
        <button onClick={() => setActiveTab('layers')} className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${activeTab === 'layers' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Layers</button>
        <button onClick={() => setActiveTab('print')} className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${activeTab === 'print' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Print</button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-thin">
        {activeTab === 'image' && (
          <>
            {/* Generative Fill Section */}
            <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 p-4 rounded-xl border border-indigo-500/30 space-y-4">
              <h4 className="font-semibold text-indigo-200 flex items-center gap-2"><Sparkles className="text-indigo-400" size={18} /> Generative Fill</h4>
              <p className="text-xs text-zinc-400">Paint mask over area to regenerate.</p>

              <button
                onClick={() => setActiveTool(activeTool === EditorTool.GENERATIVE_FILL ? EditorTool.NONE : EditorTool.GENERATIVE_FILL)}
                className={`w-full py-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 border transition-all ${activeTool === EditorTool.GENERATIVE_FILL ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700'}`}
              >
                <Brush size={14} /> {activeTool === EditorTool.GENERATIVE_FILL ? 'Stop Masking' : 'Paint Mask'}
              </button>

              <div className="flex gap-2">
                <input
                  value={genFillPrompt}
                  onChange={e => setGenFillPrompt(e.target.value)}
                  disabled={isGenerating}
                  placeholder="E.g. sunglasses, red scarf..."
                  className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleGenFill}
                  disabled={isGenerating || !genFillPrompt}
                  className="px-3 bg-indigo-600 rounded-lg text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                </button>
              </div>
            </div>

            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-4">
              <h4 className="font-semibold text-zinc-200 flex items-center gap-2"><Eraser className="text-pink-500" size={18} /> Smart Remove</h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setActiveTool(activeTool === EditorTool.PICKER_REMOVE ? EditorTool.NONE : EditorTool.PICKER_REMOVE)}
                  className={`py-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 border transition-all ${activeTool === EditorTool.PICKER_REMOVE ? 'bg-pink-600 border-pink-500 text-white' : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700'}`}
                >
                  <Wand2 size={14} /> Auto (Pick)
                </button>
                <div className="flex gap-1">
                  <button
                    onClick={() => setActiveTool(activeTool === EditorTool.BRUSH_ERASER ? EditorTool.NONE : EditorTool.BRUSH_ERASER)}
                    className={`flex-1 py-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 border transition-all ${activeTool === EditorTool.BRUSH_ERASER ? 'bg-pink-600 border-pink-500 text-white' : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700'}`}
                    title="Eraser"
                  >
                    <Eraser size={14} />
                  </button>
                  <button
                    onClick={() => setActiveTool(activeTool === EditorTool.BRUSH_RESTORE ? EditorTool.NONE : EditorTool.BRUSH_RESTORE)}
                    className={`flex-1 py-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 border transition-all ${activeTool === EditorTool.BRUSH_RESTORE ? 'bg-green-600 border-green-500 text-white' : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700'}`}
                    title="Restore"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              </div>
              {(activeTool.startsWith('BRUSH') || activeTool === EditorTool.GENERATIVE_FILL) && (
                <div className="space-y-1 pt-2 border-t border-zinc-800 animate-fade-in">
                  <label className="text-xs text-zinc-500 flex justify-between"><span>Brush Size</span><span>{state.brushSize}px</span></label>
                  <div className="flex items-center gap-2"><Circle size={8} /><input type="range" min="1" max="100" value={state.brushSize} onChange={(e) => updateState({ brushSize: parseInt(e.target.value) })} className="flex-1 h-2 bg-zinc-800 rounded-lg accent-pink-500" /><Circle size={24} /></div>
                </div>
              )}
              {!activeTool.startsWith('BRUSH') && activeTool !== EditorTool.GENERATIVE_FILL && (
                <div className="space-y-2">
                  <div className="text-xs text-zinc-500 flex justify-between"><span>Tolerance</span><span>{state.removeTolerance}</span></div>
                  <input type="range" min="1" max="150" value={state.removeTolerance} onChange={(e) => updateState({ removeTolerance: parseInt(e.target.value) })} className="w-full h-2 bg-zinc-800 rounded-lg accent-pink-500" />
                  <div className="grid grid-cols-6 gap-2">
                    {state.removeColors.map((c, i) => (
                      <div key={i} className="aspect-square rounded border border-zinc-600 relative group overflow-hidden" style={{ backgroundColor: `rgb(${c.r},${c.g},${c.b})` }}>
                        <button onClick={() => updateState({ removeColors: state.removeColors.filter((_, idx) => idx !== i) })} className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white"><Trash2 size={12} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 space-y-4">
              <h4 className="font-semibold text-zinc-200 flex items-center gap-2"><Palette className="text-indigo-500" size={18} /> Color Shift</h4>
              <button onClick={() => setActiveTool(activeTool === EditorTool.PICKER_EDIT ? EditorTool.NONE : EditorTool.PICKER_EDIT)} className={`w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border transition-all ${activeTool === EditorTool.PICKER_EDIT ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700'}`}><Pipette size={16} /> {activeTool === EditorTool.PICKER_EDIT ? 'Cancel Picker' : 'Pick Color to Edit'}</button>
              {state.editColor && (
                <div className="space-y-4 pt-2 border-t border-zinc-800">
                  <div className="space-y-1"><label className="text-xs text-zinc-500">Hue</label><input type="range" min="-180" max="180" value={state.hueShift} onChange={(e) => updateState({ hueShift: parseInt(e.target.value) })} className="w-full h-2 bg-zinc-800 rounded-lg accent-indigo-500" /></div>
                  <div className="space-y-1"><label className="text-xs text-zinc-500">Saturation</label><input type="range" min="-100" max="100" value={state.satShift} onChange={(e) => updateState({ satShift: parseInt(e.target.value) })} className="w-full h-2 bg-zinc-800 rounded-lg accent-indigo-500" /></div>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'print' && (
          <div className="space-y-6">
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-4">
              <h4 className="font-semibold text-zinc-200 flex items-center gap-2"><Printer className="text-cyan-400" size={18} /> Print Prep</h4>

              <div className="space-y-2">
                <label className="text-xs text-zinc-500">Fabric Preview</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={state.fabricColor} onChange={(e) => updateState({ fabricColor: e.target.value })} className="w-10 h-10 rounded border border-zinc-700 bg-transparent cursor-pointer" />
                  <button onClick={handleAutoContrast} className="flex-1 py-2 text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-zinc-300">Auto Contrast Fix</button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-zinc-500">Guides & Safe Area</label>
                  <button onClick={() => updateState({ showGuides: !state.showGuides })} className="text-zinc-400 hover:text-white">
                    {state.showGuides ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
                <select value={state.printPreset} onChange={(e) => updateState({ printPreset: e.target.value })} className="w-full bg-zinc-900 border border-zinc-700 text-xs rounded p-2">
                  {Object.entries(PRINT_PRESETS).map(([key, preset]) => (
                    <option key={key} value={key}>{preset.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-zinc-200 flex items-center gap-2"><LayoutTemplate size={18} /> Spot Colors</h4>
                <button onClick={runPreFlight} className="text-xs bg-indigo-600 px-2 py-1 rounded hover:bg-indigo-500">Analyze</button>
              </div>
              {spotColors.length > 0 ? (
                <div className="grid grid-cols-6 gap-2">
                  {spotColors.map((c, i) => (
                    <div key={i} className="aspect-square rounded border border-zinc-700" style={{ backgroundColor: c }} title={c}></div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic">Run analysis to see dominant spot colors.</p>
              )}
            </div>

            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-4">
              <h4 className="font-semibold text-zinc-200 flex items-center gap-2"><AlertTriangle className="text-amber-500" size={18} /> Pre-Flight Check</h4>
              {!preFlight ? (
                <button onClick={runPreFlight} className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium">Run AI Analysis</button>
              ) : (
                <div className="space-y-3 animate-fade-in">
                  <div className={`p-3 rounded-lg border flex items-center gap-3 ${preFlight.issues.length === 0 ? 'bg-green-900/20 border-green-800 text-green-400' : 'bg-red-900/20 border-red-800 text-red-400'}`}>
                    {preFlight.issues.length === 0 ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                    <span className="text-sm font-bold">{preFlight.issues.length === 0 ? "Print Ready" : "Issues Found"}</span>
                  </div>
                  {preFlight.issues.map((issue, i) => (
                    <p key={i} className="text-xs text-zinc-400">• {issue}</p>
                  ))}
                  <button onClick={() => setPreFlight(null)} className="w-full py-2 text-xs text-zinc-500 hover:text-white">Run Again</button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'effects' && (
          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-6">
            <h4 className="font-semibold text-zinc-200 flex items-center gap-2"><Sliders size={18} className="text-green-400" /> Global Filters</h4>
            <div className="space-y-3">
              <div className="space-y-1"><label className="text-xs text-zinc-500 flex items-center gap-2"><Sun size={12} /> Brightness ({state.filters.brightness})</label><input type="range" min="-100" max="100" value={state.filters.brightness} onChange={(e) => updateFilter('brightness', parseInt(e.target.value))} className="w-full h-2 bg-zinc-800 rounded-lg accent-green-500" /></div>
              <div className="space-y-1"><label className="text-xs text-zinc-500 flex items-center gap-2"><Contrast size={12} /> Contrast ({state.filters.contrast})</label><input type="range" min="-100" max="100" value={state.filters.contrast} onChange={(e) => updateFilter('contrast', parseInt(e.target.value))} className="w-full h-2 bg-zinc-800 rounded-lg accent-green-500" /></div>
              <div className="space-y-1"><label className="text-xs text-zinc-500 flex items-center gap-2"><Droplets size={12} /> Saturation ({state.filters.saturation})</label><input type="range" min="-100" max="100" value={state.filters.saturation} onChange={(e) => updateFilter('saturation', parseInt(e.target.value))} className="w-full h-2 bg-zinc-800 rounded-lg accent-green-500" /></div>
            </div>

            <div className="border-t border-zinc-800 pt-4 space-y-3">
              <h4 className="font-semibold text-zinc-200 text-sm flex items-center gap-2"><Sparkles size={14} className="text-amber-400" /> Retro FX</h4>
              <div className="space-y-1"><label className="text-xs text-zinc-500 flex items-center gap-2"><Zap size={12} /> Noise ({state.filters.noise})</label><input type="range" min="0" max="100" value={state.filters.noise} onChange={(e) => updateFilter('noise', parseInt(e.target.value))} className="w-full h-2 bg-zinc-800 rounded-lg accent-amber-500" /></div>
              <div className="space-y-1"><label className="text-xs text-zinc-500 flex items-center gap-2"><Sparkles size={12} /> Vintage ({state.filters.vintage})</label><input type="range" min="0" max="100" value={state.filters.vintage} onChange={(e) => updateFilter('vintage', parseInt(e.target.value))} className="w-full h-2 bg-zinc-800 rounded-lg accent-amber-500" /></div>
            </div>

            <div className="border-t border-zinc-800 pt-4 space-y-3">
              <h4 className="font-semibold text-zinc-200 text-sm flex items-center gap-2"><Grip size={14} className="text-blue-400" /> Screen Print</h4>
              <div className="space-y-1"><label className="text-xs text-zinc-500 flex items-center gap-2">Posterize (Levels)</label><input type="range" min="0" max="30" value={state.filters.posterize} onChange={(e) => updateFilter('posterize', parseInt(e.target.value))} className="w-full h-2 bg-zinc-800 rounded-lg accent-blue-500" /></div>
              <div className="space-y-1"><label className="text-xs text-zinc-500 flex items-center gap-2">Halftone (Dot Size)</label><input type="range" min="0" max="10" value={state.filters.halftone} onChange={(e) => updateFilter('halftone', parseInt(e.target.value))} className="w-full h-2 bg-zinc-800 rounded-lg accent-blue-500" /></div>
            </div>
          </div>
        )}

        {activeTab === 'layers' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 flex gap-2">
                <input value={newText} onChange={(e) => setNewText(e.target.value)} className="flex-1 min-w-0 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-white" placeholder="Text..." />
                <button onClick={addTextLayer} className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 text-white" title="Add Text"><Type size={18} /></button>
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 text-white" title="Add Image Overlay"><Upload size={18} /></button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
            </div>

            <div className="space-y-2">
              <h5 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Textures</h5>
              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto scrollbar-thin">
                {textures.map((t, i) => (
                  <button key={i} onClick={() => addLayer(t.url)} className="aspect-square rounded border border-zinc-700 hover:border-white overflow-hidden relative group">
                    <img src={t.url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {state.layers.length === 0 && <div className="text-zinc-500 text-xs text-center py-4">No layers added</div>}
              {state.layers.slice().reverse().map((layer) => (
                <div key={layer.id} className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 space-y-3">
                  <div className="flex justify-between items-center cursor-pointer" onClick={() => setExpandedLayerId(expandedLayerId === layer.id ? null : layer.id)}>
                    <div className="flex items-center gap-2">
                      {layer.type === 'text' ? <Type size={14} className="text-indigo-400" /> : <ImageIcon size={14} className="text-pink-400" />}
                      <span className="text-sm font-medium">{layer.type === 'text' ? (layer.text.substring(0, 10) + '...') : 'Image'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={(e) => { e.stopPropagation(); updateState({ layers: state.layers.filter(l => l.id !== layer.id) }); }} className="text-zinc-600 hover:text-red-400"><Trash2 size={14} /></button>
                    </div>
                  </div>

                  {expandedLayerId === layer.id && layer.type === 'text' && (
                    <div className="space-y-3 pt-2 border-t border-zinc-800 animate-in slide-in-from-top-2 fade-in">
                      <div className="grid grid-cols-2 gap-2">
                        <input value={layer.text} onChange={(e) => updateLayer(layer.id, { text: e.target.value })} className="bg-zinc-900 border border-zinc-800 text-xs rounded p-1" placeholder="Text content" />
                        <select value={layer.fontFamily} onChange={(e) => updateLayer(layer.id, { fontFamily: e.target.value })} className="bg-zinc-900 border border-zinc-800 text-xs rounded p-1">
                          {FONTS.map(f => <option key={f.name} value={f.family}>{f.name}</option>)}
                        </select>
                      </div>

                      {/* Color & Size */}
                      <div className="flex items-center gap-3">
                        <input type="color" value={layer.color} onChange={(e) => updateLayer(layer.id, { color: e.target.value })} className="w-8 h-8 rounded cursor-pointer bg-transparent" title="Text Color" />
                        <div className="flex-1 space-y-1">
                          <label className="text-[10px] text-zinc-500">Size</label>
                          <input type="range" min="10" max="400" value={layer.size} onChange={(e) => updateLayer(layer.id, { size: parseInt(e.target.value) })} className="w-full h-1 bg-zinc-800 rounded-lg" />
                        </div>
                      </div>

                      {/* Curvature & Spacing */}
                      <div className="space-y-2 bg-zinc-900/50 p-2 rounded">
                        <div className="flex items-center gap-2">
                          <Spline size={12} className="text-indigo-400" />
                          <span className="text-[10px] font-bold text-zinc-400">Typography</span>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-500 flex justify-between"><span>Curve</span><span>{layer.curvature}</span></label>
                          <input type="range" min="-100" max="100" value={layer.curvature || 0} onChange={(e) => updateLayer(layer.id, { curvature: parseInt(e.target.value) })} className="w-full h-1 bg-zinc-800 rounded-lg accent-indigo-500" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-500 flex justify-between"><span>Spacing</span><span>{layer.letterSpacing}</span></label>
                          <input type="range" min="-10" max="50" value={layer.letterSpacing || 0} onChange={(e) => updateLayer(layer.id, { letterSpacing: parseInt(e.target.value) })} className="w-full h-1 bg-zinc-800 rounded-lg accent-indigo-500" />
                        </div>
                      </div>

                      {/* Outline */}
                      <div className="space-y-2 bg-zinc-900/50 p-2 rounded">
                        <div className="flex items-center gap-2">
                          <CircleDashed size={12} className="text-green-400" />
                          <span className="text-[10px] font-bold text-zinc-400">Outline</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input type="color" value={layer.strokeColor || '#000000'} onChange={(e) => updateLayer(layer.id, { strokeColor: e.target.value })} className="w-6 h-6 rounded cursor-pointer bg-transparent" />
                          <div className="flex-1">
                            <input type="range" min="0" max="20" value={layer.strokeWidth || 0} onChange={(e) => updateLayer(layer.id, { strokeWidth: parseInt(e.target.value) })} className="w-full h-1 bg-zinc-800 rounded-lg accent-green-500" />
                          </div>
                        </div>
                      </div>

                      {/* Shadow */}
                      <div className="space-y-2 bg-zinc-900/50 p-2 rounded">
                        <div className="flex items-center gap-2">
                          <Circle size={12} className="text-zinc-400 shadow-sm" />
                          <span className="text-[10px] font-bold text-zinc-400">Shadow</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input type="color" value={layer.shadowColor || '#000000'} onChange={(e) => updateLayer(layer.id, { shadowColor: e.target.value })} className="w-6 h-6 rounded cursor-pointer bg-transparent" />
                          <div className="flex-1">
                            <input type="range" min="0" max="50" value={layer.shadowBlur || 0} onChange={(e) => updateLayer(layer.id, { shadowBlur: parseInt(e.target.value) })} className="w-full h-1 bg-zinc-800 rounded-lg accent-zinc-500" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {expandedLayerId === layer.id && layer.type === 'image' && (
                    <div className="space-y-2 pt-2 border-t border-zinc-800 animate-in slide-in-from-top-2 fade-in">
                      <div className="flex items-center gap-2"><span className="text-[10px] text-zinc-500">Scale</span><input type="range" min="5" max="100" value={layer.scale} onChange={(e) => updateLayer(layer.id, { scale: parseInt(e.target.value) })} className="flex-1 h-1 bg-zinc-800 rounded-lg" /></div>
                      <div className="flex items-center gap-2"><span className="text-[10px] text-zinc-500">Rot</span><input type="range" min="0" max="360" value={layer.rotation} onChange={(e) => updateLayer(layer.id, { rotation: parseInt(e.target.value) })} className="flex-1 h-1 bg-zinc-800 rounded-lg" /></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto flex gap-3 pt-4 border-t border-zinc-800 shrink-0">
        <button onClick={onBack} className="flex-1 py-3 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-medium">Back</button>
        <button onClick={onComplete} className="flex-[2] py-3 rounded-xl bg-white text-black hover:bg-zinc-200 font-bold flex items-center justify-center gap-2">Next <ArrowRight size={18} /></button>
      </div>
    </div>
  );
};
export default EditorToolbar;
