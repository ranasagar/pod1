import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Layout, Blend, Grid, Shirt, Coffee, ShoppingBag, MoreHorizontal, Check, RefreshCw, Eraser, Scissors, ShieldCheck, Zap, Loader2 } from 'lucide-react';
import { PatternType, PRINT_PRESETS } from '../types';
import { getMockups } from '../services/storage';

interface MockupStudioProps {
  designUrl: string;
  onBack: () => void;
}

type BlendMode = 'source-over' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten';

const CATEGORY_ICONS: any = {
  apparel: <Shirt size={16} />,
  home: <Coffee size={16} />,
  accessories: <ShoppingBag size={16} />
};

const MockupStudio: React.FC<MockupStudioProps> = ({ designUrl, onBack }) => {
  const [mockups, setMockups] = useState<any>({ apparel: [], home: [], accessories: [] });
  const [activeCategory, setActiveCategory] = useState<string>('apparel');
  const [mockupImage, setMockupImage] = useState<string>('');

  const [scale, setScale] = useState(30);
  const [posX, setPosX] = useState(50);
  const [posY, setPosY] = useState(40);
  const [rotation, setRotation] = useState(0);
  const [blendMode, setBlendMode] = useState<BlendMode>('multiply');
  const [opacity, setOpacity] = useState(90);

  const [isPattern, setIsPattern] = useState(false);
  const [patternType, setPatternType] = useState<PatternType>(PatternType.GRID);
  const [patternScale, setPatternScale] = useState(20);

  const [removeBg, setRemoveBg] = useState(false);
  const [processedDesignUrl, setProcessedDesignUrl] = useState(designUrl);
  const [isExporting, setIsExporting] = useState(false);

  const canvasPatternRef = useRef<HTMLCanvasElement>(null);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [exportTarget, setExportTarget] = useState<'mockup' | 'design' | 'pattern'>('mockup');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadMockups(); }, []);

  // Update processed image if background removal is toggled
  useEffect(() => {
    if (!removeBg) { setProcessedDesignUrl(designUrl); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = designUrl;
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const r0 = data[0], g0 = data[1], b0 = data[2];
        const tolerance = 30;
        for (let i = 0; i < data.length; i += 4) {
          if (Math.abs(data[i] - r0) < tolerance && Math.abs(data[i + 1] - g0) < tolerance && Math.abs(data[i + 2] - b0) < tolerance) {
            data[i + 3] = 0;
          }
        }
        ctx.putImageData(imageData, 0, 0);
        setProcessedDesignUrl(canvas.toDataURL());
      } catch (e) { setProcessedDesignUrl(designUrl); }
    };
  }, [designUrl, removeBg]);

  // LIVE PATTERN PREVIEW LOGIC
  useEffect(() => {
    if (!isPattern || !canvasPatternRef.current || !processedDesignUrl) return;

    const canvas = canvasPatternRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = processedDesignUrl;
    img.onload = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const pScale = patternScale / 100;
      const imgW = w * pScale;
      const imgH = (img.naturalHeight / img.naturalWidth) * imgW;

      ctx.save();
      // Translate to center and rotate the whole tiled canvas
      ctx.translate(w / 2, h / 2);
      ctx.rotate((rotation * Math.PI) / 180);

      // Calculate tiling grid coverage
      const diag = Math.sqrt(w ** 2 + h ** 2) * 1.5;
      const startX = -diag / 2;
      const startY = -diag / 2;
      const cols = Math.ceil(diag / imgW) + 2;
      const rows = Math.ceil(diag / imgH) + 2;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let x = startX + c * imgW;
          let y = startY + r * imgH;

          if (patternType === PatternType.BRICK && r % 2 !== 0) {
            x += imgW / 2;
          } else if (patternType === PatternType.HALF_DROP && c % 2 !== 0) {
            y += imgH / 2;
          }

          ctx.drawImage(img, x, y, imgW, imgH);
        }
      }
      ctx.restore();
    };
  }, [isPattern, patternType, patternScale, rotation, processedDesignUrl]);

  const loadMockups = async () => {
    const data = await getMockups(); setMockups(data);
    if (!mockupImage) {
      if (data.apparel?.length) setMockupImage(data.apparel[0]);
      else if (data.home?.length) setMockupImage(data.home[0]);
      else if (data.accessories?.length) setMockupImage(data.accessories[0]);
    }
  };

  const handleDownloadDesign = (presetKey?: string, upscaleMult: number = 1) => {
    setIsExporting(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = processedDesignUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      if (presetKey && PRINT_PRESETS[presetKey]) {
        const p = PRINT_PRESETS[presetKey];
        canvas.width = p.width * p.dpi; canvas.height = p.height * p.dpi;
      } else {
        canvas.width = img.naturalWidth * upscaleMult;
        canvas.height = img.naturalHeight * upscaleMult;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      const s = Math.min(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
      const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
      ctx.drawImage(img, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `design-${upscaleMult}x-${Date.now()}.png`; a.click();
      setIsExporting(false); setShowExportOptions(false);
    };
  };

  const handleDownloadMockup = (resMult: number = 1) => {
    setIsExporting(true);
    const bg = new Image(); bg.crossOrigin = 'anonymous'; bg.src = mockupImage;
    bg.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = bg.naturalWidth * resMult; canvas.height = bg.naturalHeight * resMult;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
      const design = new Image(); design.crossOrigin = 'anonymous'; design.src = processedDesignUrl;
      design.onload = () => {
        ctx.save(); ctx.globalAlpha = opacity / 100; ctx.globalCompositeOperation = blendMode;
        if (isPattern) {
          const pScale = patternScale / 100; const imgW = canvas.width * pScale;
          const imgH = (design.naturalHeight / design.naturalWidth) * imgW;
          const pCanvas = document.createElement('canvas');
          const diag = Math.sqrt(canvas.width ** 2 + canvas.height ** 2) * 1.5;
          pCanvas.width = diag; pCanvas.height = diag;
          const pCtx = pCanvas.getContext('2d');
          if (pCtx) {
            pCtx.imageSmoothingEnabled = true; pCtx.imageSmoothingQuality = 'high';
            const safeCols = Math.ceil(diag / imgW) + 2; const safeRows = Math.ceil(diag / imgH) + 2;
            for (let r = 0; r < safeRows; r++) {
              for (let c = 0; c < safeCols; c++) {
                let x = c * imgW, y = r * imgH;
                if (patternType === PatternType.BRICK && r % 2 !== 0) x += imgW / 2;
                else if (patternType === PatternType.HALF_DROP && c % 2 !== 0) y += imgH / 2;
                pCtx.drawImage(design, x, y, imgW, imgH);
              }
            }
            ctx.translate(canvas.width / 2, canvas.height / 2); ctx.rotate((rotation * Math.PI) / 180);
            ctx.drawImage(pCanvas, -diag / 2, -diag / 2);
          }
        } else {
          const dw = (canvas.width * scale) / 100, dh = (design.naturalHeight / design.naturalWidth) * dw;
          ctx.translate((canvas.width * posX) / 100, (canvas.height * posY) / 100);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.drawImage(design, -dw / 2, -dh / 2, dw, dh);
        }
        ctx.restore();
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/jpeg', 0.95);
        a.download = `mockup-${resMult}x-${Date.now()}.jpg`; a.click();
        setIsExporting(false); setShowExportOptions(false);
      };
    };
  };

  const handleDownloadPattern = (mult: number) => {
    setIsExporting(true);
    const img = new Image(); img.crossOrigin = 'anonymous'; img.src = processedDesignUrl;
    img.onload = () => {
      const base = 2000; const w = base * mult, h = base * mult;
      const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d'); if (!ctx) return;
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      const pScale = patternScale / 100; const imgW = w * pScale, imgH = (img.naturalHeight / img.naturalWidth) * imgW;
      ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate((rotation * Math.PI) / 180);
      const diag = Math.sqrt(w * w + h * h); const safeCols = Math.ceil(diag / imgW) + 2, safeRows = Math.ceil(diag / imgH) + 2;
      for (let r = 0; r < safeRows; r++) {
        for (let c = 0; c < safeCols; c++) {
          let x = (w - safeCols * imgW) / 2 + c * imgW, y = (h - safeRows * imgH) / 2 + r * imgH;
          if (patternType === PatternType.BRICK && r % 2 !== 0) x += imgW / 2;
          else if (patternType === PatternType.HALF_DROP && c % 2 !== 0) y += imgH / 2;
          ctx.drawImage(img, x, y, imgW, imgH);
        }
      }
      ctx.restore();
      const a = document.createElement('a'); a.href = canvas.toDataURL('image/png');
      a.download = `pattern-${mult}x.png`; a.click();
      setIsExporting(false); setShowExportOptions(false);
    };
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6 animate-fade-in">
      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center p-8 relative overflow-hidden group">
        <div className="relative shadow-2xl overflow-hidden max-h-[75vh] rounded-lg bg-white/5">
          {mockupImage && <img src={mockupImage} className="max-w-full max-h-[75vh] object-contain block select-none pointer-events-none" />}
          <div className="absolute inset-0" style={{ mixBlendMode: blendMode as any, opacity: opacity / 100 }}>
            {isPattern ? (
              <canvas ref={canvasPatternRef} width={1000} height={1000} className="w-full h-full object-cover" />
            ) : (
              <div className="absolute" style={{ top: `${posY}%`, left: `${posX}%`, width: `${scale}%`, transform: `translate(-50%, -50%) rotate(${rotation}deg)` }}>
                <img src={processedDesignUrl} className="w-full h-auto" />
              </div>
            )}
          </div>
        </div>
        {isExporting && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4 text-white">
            <Loader2 className="animate-spin" size={48} />
            <div className="text-center">
              <p className="font-bold text-lg">Generating High-Res Assets...</p>
              <p className="text-sm text-zinc-400">Processing upscaled textures and vectors</p>
            </div>
          </div>
        )}
      </div>

      <div className="w-full lg:w-96 bg-zinc-900 p-6 border-l border-zinc-800 flex flex-col gap-6 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">Product Studio</h3>
          <div className="flex items-center gap-1 px-2 py-0.5 bg-indigo-500/20 rounded border border-indigo-500/40 text-[10px] font-bold text-indigo-400">
            <ShieldCheck size={10} /> 4K READY
          </div>
        </div>

        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3"><Scissors className={removeBg ? "text-pink-400" : "text-zinc-600"} size={20} /><div><div className="text-sm font-medium">Auto-Crop design</div><div className="text-xs text-zinc-500">Removes background noise</div></div></div>
          <button onClick={() => setRemoveBg(!removeBg)} className={`w-12 h-6 rounded-full transition-colors relative ${removeBg ? 'bg-pink-600' : 'bg-zinc-700'}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${removeBg ? 'left-7' : 'left-1'}`}></div></button>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium">Product Category</label>
          <div className="flex gap-2 p-1 bg-zinc-950 rounded-lg border border-zinc-800">
            {['apparel', 'home', 'accessories'].map(cat => (
              <button key={cat} onClick={() => { setActiveCategory(cat); if (mockups[cat]?.length) setMockupImage(mockups[cat][0]); }} className={`flex-1 py-2 rounded-md flex items-center justify-center gap-2 text-xs font-medium transition-all capitalize ${activeCategory === cat ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}>{CATEGORY_ICONS[cat]} {cat}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto scrollbar-thin">
          {(mockups[activeCategory] || []).map((url: string, i: number) => (
            <button key={i} onClick={() => setMockupImage(url)} className={`aspect-square rounded-lg border-2 transition-all ${mockupImage === url ? 'border-indigo-500' : 'border-transparent opacity-60 hover:opacity-100'}`}><img src={url} className="w-full h-full object-cover rounded-md" /></button>
          ))}
          <button onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-lg border border-zinc-700 bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"><Upload size={20} /></button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && setMockupImage(URL.createObjectURL(e.target.files[0]))} />
        </div>

        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3"><Grid className={isPattern ? "text-indigo-400" : "text-zinc-600"} size={20} /><div><div className="text-sm font-medium">Pattern Mode</div><div className="text-xs text-zinc-500">Tiled print layout</div></div></div>
          <button onClick={() => setIsPattern(!isPattern)} className={`w-12 h-6 rounded-full transition-colors relative ${isPattern ? 'bg-indigo-600' : 'bg-zinc-700'}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${isPattern ? 'left-7' : 'left-1'}`}></div></button>
        </div>

        <div className="space-y-4 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
          <h4 className="font-semibold flex items-center gap-2"><Layout size={16} /> Placement</h4>
          {isPattern ? (
            <div className="space-y-3">
              <div className="flex gap-1">
                {Object.values(PatternType).map(t => <button key={t} onClick={() => setPatternType(t as PatternType)} className={`flex-1 py-1.5 text-[10px] border rounded transition-all ${patternType === t ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-zinc-800 text-zinc-500'}`}>{t}</button>)}
              </div>
              <div className="space-y-1"><label className="text-[10px] text-zinc-500 flex justify-between"><span>Density</span><span>{patternScale}%</span></label><input type="range" min="5" max="50" value={patternScale} onChange={(e) => setPatternScale(Number(e.target.value))} className="w-full h-1.5 bg-zinc-800 rounded-lg accent-indigo-500" /></div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1"><label className="text-[10px] text-zinc-500 flex justify-between"><span>Dimensions</span><span>{scale}%</span></label><input type="range" min="5" max="90" value={scale} onChange={(e) => setScale(Number(e.target.value))} className="w-full h-1.5 bg-zinc-800 rounded-lg accent-indigo-500" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[10px] text-zinc-500">Pos X</label><input type="range" min="0" max="100" value={posX} onChange={(e) => setPosX(Number(e.target.value))} className="w-full h-1.5 bg-zinc-800 rounded-lg accent-indigo-500" /></div>
                <div className="space-y-1"><label className="text-[10px] text-zinc-500">Pos Y</label><input type="range" min="0" max="100" value={posY} onChange={(e) => setPosY(Number(e.target.value))} className="w-full h-1.5 bg-zinc-800 rounded-lg accent-indigo-500" /></div>
              </div>
            </div>
          )}
          <div className="space-y-1"><label className="text-[10px] text-zinc-500 flex justify-between"><span>Angle</span><span>{rotation}°</span></label><input type="range" min="-180" max="180" value={rotation} onChange={(e) => setRotation(Number(e.target.value))} className="w-full h-1.5 bg-zinc-800 rounded-lg accent-indigo-500" /></div>
        </div>

        <div className="mt-auto space-y-3 pt-4 border-t border-zinc-800 relative">
          <div className="flex gap-2">
            <button onClick={() => handleDownloadMockup(2)} disabled={isExporting} className="flex-1 py-3 rounded-xl bg-white text-black font-bold flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all disabled:opacity-50 shadow-lg shadow-white/5">
              <Download size={18} /> Export Mockup
            </button>
            <button onClick={() => setShowExportOptions(!showExportOptions)} className="w-12 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center transition-all"><MoreHorizontal size={20} /></button>
          </div>

          {showExportOptions && (
            <div className="absolute bottom-full right-0 mb-2 w-full bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-20 animate-in slide-in-from-bottom-2">
              <div className="flex border-b border-zinc-800 bg-zinc-950">
                {['mockup', 'pattern', 'design'].map(t => <button key={t} onClick={() => setExportTarget(t as any)} className={`flex-1 py-2 text-xs font-bold transition-all capitalize ${exportTarget === t ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>{t}</button>)}
              </div>
              <div className="p-2 space-y-1">
                <div className="text-[10px] font-bold text-indigo-400 px-2 py-1 uppercase tracking-tighter flex items-center gap-1"><Zap size={10} /> High Fidelity Upscale</div>
                {(exportTarget === 'design' ? Object.keys(PRINT_PRESETS) : [1, 2, 4]).map((val: any) => (
                  <button key={val} onClick={() => {
                    if (exportTarget === 'design') handleDownloadDesign(val);
                    else if (exportTarget === 'mockup') handleDownloadMockup(val);
                    else handleDownloadPattern(val);
                  }} className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-800 rounded-lg text-white flex justify-between items-center group">
                    <span className="font-medium">{exportTarget === 'design' ? PRINT_PRESETS[val].name : `${val}x ${val === 4 ? 'Professional' : val === 2 ? 'High-Def' : 'Standard'}`}</span>
                    {typeof val === 'number' && val > 1 && <span className={`text-[9px] px-1.5 rounded-full border ${val === 4 ? 'border-amber-500 text-amber-500' : 'border-indigo-500 text-indigo-500'}`}>UPSCALED</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button onClick={onBack} className="w-full py-2 text-xs text-zinc-500 hover:text-white font-medium">Back to Editor</button>
        </div>
      </div>
    </div>
  );
};

export default MockupStudio;