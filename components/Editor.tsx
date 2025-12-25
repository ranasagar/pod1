
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { EditorTool, EditorState, Layer, TextLayer, PRINT_PRESETS } from '../types';
import { processImage, getColorDistance } from '../utils/colorUtils';
import { applyFilters } from '../utils/filterUtils';
import { editDesign } from '../services/gemini';
import EditorToolbar from './EditorToolbar';
import { Undo2, Redo2, ZoomIn, ZoomOut, AlertOctagon } from 'lucide-react';

interface EditorProps {
  imageUrl: string;
  onComplete: (processedUrl: string) => void;
  onBack: () => void;
}

const Editor: React.FC<EditorProps> = ({ imageUrl, onComplete, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const genMaskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const contentCanvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);
  const [activeTool, setActiveTool] = useState<EditorTool>(EditorTool.NONE);
  const [loadError, setLoadError] = useState(false);
  
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null);
  const [isDrawingMask, setIsDrawingMask] = useState(false);
  
  const loadedImages = useRef<Map<string, HTMLImageElement>>(new Map());

  const [state, setState] = useState<EditorState>({
    removeColors: [],
    removeTolerance: 30,
    editColor: null,
    editTolerance: 40,
    hueShift: 0,
    satShift: 0,
    layers: [],
    filters: {
      brightness: 0, contrast: 0, saturation: 0,
      noise: 0, vintage: 0, blur: 0, sharpen: 0,
      posterize: 0, halftone: 0
    },
    brushSize: 20,
    sticker: { enabled: false, color: '#FFFFFF', width: 20 },
    fabricColor: '#18181b', // Default dark
    showGuides: false,
    printPreset: 'standard'
  });

  const [history, setHistory] = useState<EditorState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Initialize history
  useEffect(() => {
    if (historyIndex === -1) {
      setHistory([state]);
      setHistoryIndex(0);
    }
  }, []);

  useEffect(() => {
     if (!maskCanvasRef.current) maskCanvasRef.current = document.createElement('canvas');
     if (!contentCanvasRef.current) contentCanvasRef.current = document.createElement('canvas');
     if (!genMaskCanvasRef.current) genMaskCanvasRef.current = document.createElement('canvas');
  }, []);

  const updateState = (newState: Partial<EditorState>) => {
    const nextState = { ...state, ...newState };
    // Only push to history if meaningful change (not just hover/guide toggle)
    if (!newState.showGuides) {
        const historyState = JSON.parse(JSON.stringify(nextState));
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(historyState);
        if (newHistory.length > 20) newHistory.shift(); 
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }
    setState(nextState);
  };

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    
    img.onerror = () => {
      console.error("Failed to load image into editor");
      setLoadError(true);
    };

    img.onload = () => {
      if (!canvasRef.current || !maskCanvasRef.current || !contentCanvasRef.current || !genMaskCanvasRef.current) return;
      
      if (img.width === 0 || img.height === 0) {
         setLoadError(true);
         return;
      }

      const w = img.width;
      const h = img.height;
      
      canvasRef.current.width = w;
      canvasRef.current.height = h;
      
      maskCanvasRef.current.width = w;
      maskCanvasRef.current.height = h;
      const mCtx = maskCanvasRef.current.getContext('2d');
      if (mCtx) { mCtx.fillStyle = '#FFFFFF'; mCtx.fillRect(0, 0, w, h); }

      genMaskCanvasRef.current.width = w;
      genMaskCanvasRef.current.height = h;
      const gCtx = genMaskCanvasRef.current.getContext('2d');
      if (gCtx) gCtx.clearRect(0, 0, w, h);

      contentCanvasRef.current.width = w;
      contentCanvasRef.current.height = h;

      const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      
      try {
        const data = ctx.getImageData(0, 0, w, h);
        setOriginalImageData(data);

        // Auto background detection (corner strategy)
        const corners = [{ x: 0, y: 0 }, { x: w-1, y: 0 }, { x: 0, y: h-1 }, { x: w-1, y: h-1 }];
        const pixelData = data.data;
        const getPixel = (x: number, y: number) => {
           const i = (y * w + x) * 4;
           return { r: pixelData[i], g: pixelData[i+1], b: pixelData[i+2] };
        };
        const c1 = getPixel(0,0);
        let matchCount = 0;
        corners.forEach(p => { if (getColorDistance(c1, getPixel(p.x, p.y)) < 15) matchCount++; });
        if (matchCount >= 3) {
           setState(prev => ({ ...prev, removeColors: [c1] }));
        }
      } catch (e) {
        console.error("Failed to get image data", e);
        setLoadError(true);
      }
    };
  }, [imageUrl]);

  const renderTextLayer = (ctx: CanvasRenderingContext2D, layer: TextLayer) => {
    ctx.font = `${layer.size}px ${layer.fontFamily}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.shadowColor = layer.shadowColor;
    ctx.shadowBlur = layer.shadowBlur;
    ctx.shadowOffsetX = layer.shadowOffsetX;
    ctx.shadowOffsetY = layer.shadowOffsetY;

    if (layer.curvature === 0) {
      if (layer.strokeWidth > 0) {
         ctx.strokeStyle = layer.strokeColor;
         ctx.lineWidth = layer.strokeWidth;
         ctx.strokeText(layer.text, 0, 0);
      }
      ctx.fillStyle = layer.color;
      ctx.fillText(layer.text, 0, 0);
    } else {
      const radius = (10000 / (layer.curvature || 1));
      const angleStep = (layer.size * 0.5) / radius;
      const totalArc = layer.text.length * angleStep + (layer.text.length - 1) * (layer.letterSpacing / 100);
      const startAngle = -totalArc / 2;
      layer.text.split('').forEach((char, i) => {
         ctx.save();
         const charAngle = startAngle + i * (angleStep + (layer.letterSpacing / 500));
         ctx.rotate(charAngle);
         const y = layer.curvature > 0 ? -radius : radius;
         ctx.translate(0, y);
         if (layer.curvature < 0) ctx.rotate(Math.PI);
         if (layer.strokeWidth > 0) {
            ctx.strokeStyle = layer.strokeColor;
            ctx.lineWidth = layer.strokeWidth;
            ctx.strokeText(char, 0, 0);
         }
         ctx.fillStyle = layer.color;
         ctx.fillText(char, 0, 0);
         ctx.restore();
      });
    }
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  };

  const renderCanvas = useCallback(async () => {
    if (!canvasRef.current || !originalImageData || !maskCanvasRef.current || !contentCanvasRef.current || !genMaskCanvasRef.current) return;
    const mainCtx = canvasRef.current.getContext('2d');
    const contentCtx = contentCanvasRef.current.getContext('2d');
    const maskCtx = maskCanvasRef.current.getContext('2d');
    
    if (!mainCtx || !contentCtx || !maskCtx) return;

    const w = canvasRef.current.width;
    const h = canvasRef.current.height;

    contentCtx.clearRect(0, 0, w, h);

    const processed = processImage(
      contentCtx, originalImageData, state.removeColors, state.removeTolerance,
      state.editColor, state.hueShift, state.satShift, state.editTolerance
    );

    // Apply manual mask
    const maskData = maskCtx.getImageData(0, 0, processed.width, processed.height);
    const pData = processed.data;
    const mPixels = maskData.data;
    for (let i = 0; i < pData.length; i += 4) {
        if (mPixels[i] < 255) pData[i + 3] = Math.min(pData[i+3], mPixels[i]); 
    }

    const filtered = applyFilters(processed, state.filters);
    contentCtx.putImageData(filtered, 0, 0);

    for (const layer of state.layers) {
        const x = (contentCanvasRef.current.width * layer.x) / 100;
        const y = (contentCanvasRef.current.height * layer.y) / 100;
        contentCtx.save();
        contentCtx.translate(x, y);
        if (layer.type === 'text') {
           renderTextLayer(contentCtx, layer);
        } else if (layer.type === 'image') {
            let img = loadedImages.current.get(layer.url);
            if (!img) {
                img = new Image();
                img.src = layer.url;
                await new Promise((resolve) => { img!.onload = resolve; });
                loadedImages.current.set(layer.url, img);
            }
            if (img.complete) {
                const w = (contentCanvasRef.current.width * layer.scale) / 100;
                const h = (img.height / img.width) * w;
                contentCtx.rotate((layer.rotation * Math.PI) / 180);
                contentCtx.drawImage(img, -w/2, -h/2, w, h);
            }
        }
        contentCtx.restore();
    }

    mainCtx.clearRect(0, 0, w, h);

    // Draw Fabric Color Background (if enabled and not just transparent)
    // This is for PREVIEW only. Content canvas is kept clean.
    if (state.fabricColor && state.fabricColor !== '#00000000') {
      mainCtx.fillStyle = state.fabricColor;
      mainCtx.fillRect(0,0,w,h);
    }

    if (state.sticker.enabled) {
        mainCtx.save();
        const sw = state.sticker.width;
        mainCtx.shadowColor = state.sticker.color;
        mainCtx.shadowBlur = sw; 
        for(let i=0; i<10; i++) {
            mainCtx.drawImage(contentCanvasRef.current, 0, 0);
            mainCtx.drawImage(contentCanvasRef.current, 0, 0);
        }
        mainCtx.restore();
        mainCtx.drawImage(contentCanvasRef.current, 0, 0);
    } else {
        mainCtx.drawImage(contentCanvasRef.current, 0, 0);
    }

    if (activeTool === EditorTool.GENERATIVE_FILL) {
        mainCtx.save();
        mainCtx.globalAlpha = 0.5;
        mainCtx.drawImage(genMaskCanvasRef.current, 0, 0);
        mainCtx.restore();
    }

    // Render Safe Area Guides
    if (state.showGuides) {
      const preset = PRINT_PRESETS[state.printPreset];
      if (preset) {
        const ppi = w / preset.width;
        const marginPx = preset.safeMargin * ppi;
        
        mainCtx.strokeStyle = 'cyan';
        mainCtx.lineWidth = 2;
        mainCtx.setLineDash([10, 10]);
        mainCtx.strokeRect(marginPx, marginPx, w - (marginPx * 2), h - (marginPx * 2));
        
        mainCtx.fillStyle = 'rgba(0, 255, 255, 0.1)';
        mainCtx.fillRect(marginPx, marginPx, w - (marginPx * 2), h - (marginPx * 2));
        
        mainCtx.strokeStyle = 'red';
        mainCtx.setLineDash([]);
        mainCtx.lineWidth = 4;
        mainCtx.strokeRect(0, 0, w, h);
      }
    }

  }, [originalImageData, state, activeTool]);

  useEffect(() => { 
      const frame = requestAnimationFrame(renderCanvas);
      return () => cancelAnimationFrame(frame);
  }, [renderCanvas]);

  const getCanvasCoords = (e: React.PointerEvent | React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    return {
       x: (e.clientX - rect.left) * scaleX,
       y: (e.clientY - rect.top) * scaleY
    };
  };

  const drawMask = (x: number, y: number, type: 'manual' | 'gen', isEraser: boolean) => {
      let targetCanvas, fillStyle;

      if (type === 'gen') {
          targetCanvas = genMaskCanvasRef.current;
          fillStyle = '#8b5cf6'; // Visual purple
      } else {
          targetCanvas = maskCanvasRef.current;
          fillStyle = isEraser ? '#000000' : '#FFFFFF';
      }

      if (!targetCanvas) return;
      const ctx = targetCanvas.getContext('2d');
      if (!ctx) return;
      
      ctx.beginPath();
      ctx.arc(x, y, state.brushSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = fillStyle;
      ctx.fill();
      renderCanvas();
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const coords = getCanvasCoords(e);
    
    // Manual Mask Tools
    if (activeTool === EditorTool.BRUSH_ERASER) {
        setIsDrawingMask(true);
        drawMask(coords.x, coords.y, 'manual', true);
        return;
    }
    if (activeTool === EditorTool.BRUSH_RESTORE) {
        setIsDrawingMask(true);
        drawMask(coords.x, coords.y, 'manual', false);
        return;
    }

    if (activeTool === EditorTool.GENERATIVE_FILL) {
        setIsDrawingMask(true);
        drawMask(coords.x, coords.y, 'gen', false); 
        return;
    }

    if (activeTool === EditorTool.NONE) {
       for (let i = state.layers.length - 1; i >= 0; i--) {
          const layer = state.layers[i];
          const tx = (canvasRef.current!.width * layer.x) / 100;
          const ty = (canvasRef.current!.height * layer.y) / 100;
          let hit = false;
          if (layer.type === 'text') {
              const w = (layer.text.length * layer.size) * 0.5;
              if (Math.abs(coords.x - tx) < w && Math.abs(coords.y - ty) < layer.size) hit = true;
          } else {
              const w = (canvasRef.current!.width * layer.scale) / 100;
              if (Math.abs(coords.x - tx) < w/2 && Math.abs(coords.y - ty) < w/2) hit = true;
          }
          if (hit) {
             setDraggingLayerId(layer.id);
             return;
          }
       }
    }

    if (activeTool === EditorTool.NONE || activeTool.startsWith('PICKER') || e.button === 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const coords = getCanvasCoords(e);
    if (isDrawingMask) {
        if (activeTool === EditorTool.BRUSH_ERASER) {
            drawMask(coords.x, coords.y, 'manual', true);
            return;
        }
        if (activeTool === EditorTool.BRUSH_RESTORE) {
            drawMask(coords.x, coords.y, 'manual', false);
            return;
        }
        if (activeTool === EditorTool.GENERATIVE_FILL) {
            drawMask(coords.x, coords.y, 'gen', false);
            return;
        }
    }
    if (draggingLayerId) {
       const nx = (coords.x / canvasRef.current!.width) * 100;
       const ny = (coords.y / canvasRef.current!.height) * 100;
       updateState({ 
          layers: state.layers.map(l => l.id === draggingLayerId ? {...l, x: nx, y: ny} : l) 
       });
       return;
    }
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setDraggingLayerId(null);
    setIsDrawingMask(false);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (isDragging || draggingLayerId || isDrawingMask) return;
    if (activeTool === EditorTool.BRUSH_ERASER || activeTool === EditorTool.BRUSH_RESTORE || activeTool === EditorTool.GENERATIVE_FILL) return;
    
    const { x, y } = getCanvasCoords(e);
    const ctx = canvasRef.current!.getContext('2d')!;
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const color = { r: pixel[0], g: pixel[1], b: pixel[2] };
    if (activeTool === EditorTool.PICKER_REMOVE) {
      updateState({ removeColors: [...state.removeColors, color] });
      setActiveTool(EditorTool.NONE);
    } else if (activeTool === EditorTool.PICKER_EDIT) {
      updateState({ editColor: color, hueShift: 0, satShift: 0 });
      setActiveTool(EditorTool.NONE);
    }
  };

  const handleGenerativeFill = async (prompt: string): Promise<string> => {
     if (!contentCanvasRef.current || !genMaskCanvasRef.current) throw new Error("Canvas not ready");
     
     const w = contentCanvasRef.current.width;
     const h = contentCanvasRef.current.height;
     const tempCanvas = document.createElement('canvas');
     tempCanvas.width = w;
     tempCanvas.height = h;
     const ctx = tempCanvas.getContext('2d');
     if (!ctx) throw new Error("Context lost");

     ctx.drawImage(contentCanvasRef.current, 0, 0);
     ctx.globalCompositeOperation = 'destination-out';
     ctx.drawImage(genMaskCanvasRef.current, 0, 0);
     
     const imageBase64 = tempCanvas.toDataURL('image/png');
     const fullPrompt = `Fill the transparent/missing area with: ${prompt}. Blend seamlessly. Keep the rest of the image exactly as is.`;
     const resultUrl = await editDesign(imageBase64, fullPrompt);

     const resultImg = new Image();
     resultImg.src = resultUrl;
     await new Promise((resolve) => { resultImg.onload = resolve; });

     const patchCanvas = document.createElement('canvas');
     patchCanvas.width = w;
     patchCanvas.height = h;
     const pCtx = patchCanvas.getContext('2d');
     if (!pCtx) throw new Error("Context lost");

     pCtx.drawImage(resultImg, 0, 0);
     pCtx.globalCompositeOperation = 'destination-in';
     pCtx.drawImage(genMaskCanvasRef.current, 0, 0);

     const finalUrl = patchCanvas.toDataURL('image/png');

     updateState({
        layers: [...state.layers, {
            id: Date.now().toString(),
            type: 'image',
            url: finalUrl,
            x: 50,
            y: 50,
            scale: 100,
            rotation: 0
        }]
     });

     const gCtx = genMaskCanvasRef.current.getContext('2d');
     if(gCtx) gCtx.clearRect(0, 0, w, h);
     
     return finalUrl;
  };
  
  const getCanvas = () => canvasRef.current;
  const getContentCanvas = () => contentCanvasRef.current;

  if (loadError) {
      return (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8 bg-zinc-900 rounded-2xl border border-zinc-800">
              <AlertOctagon size={48} className="text-red-500" />
              <div>
                <h3 className="text-xl font-bold text-white">Image Load Failed</h3>
                <p className="text-zinc-400 mt-2 max-w-md">The generated image could not be loaded. This might be due to a browser memory limit or an invalid image format.</p>
              </div>
              <button onClick={onBack} className="px-6 py-3 bg-indigo-600 rounded-xl font-bold hover:bg-indigo-500 text-white">
                  Return to Generator
              </button>
          </div>
      );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6 animate-fade-in relative">
      <div 
        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden relative checkboard-bg cursor-move group"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={(e) => setZoom(z => Math.max(0.1, Math.min(5, z + e.deltaY * -0.001)))}
      >
        <div className="w-full h-full flex items-center justify-center p-12">
           <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
            className={`shadow-2xl transition-transform duration-75 ease-out ${activeTool !== EditorTool.NONE && !activeTool.startsWith('BRUSH') && activeTool !== EditorTool.GENERATIVE_FILL ? 'cursor-crosshair' : ''} ${activeTool.startsWith('BRUSH') || activeTool === EditorTool.GENERATIVE_FILL ? 'cursor-none' : ''}`}
          />
        </div>
        
        {(activeTool.startsWith('BRUSH') || activeTool === EditorTool.GENERATIVE_FILL) && (
            <div className={`absolute pointer-events-none border-2 rounded-full mix-blend-difference ${activeTool === EditorTool.BRUSH_ERASER ? 'border-red-500 bg-red-500/20' : 'border-white bg-white/20'}`}
                 style={{ width: state.brushSize * zoom, height: state.brushSize * zoom, left: '50%', top: '50%', transform: 'translate(-50%, -50%)', display: 'none' }}></div>
        )}

        <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-zinc-950/90 backdrop-blur p-2 rounded-lg border border-zinc-700 shadow-xl opacity-50 group-hover:opacity-100 transition-opacity">
           <button onClick={() => setZoom(z => Math.max(0.1, z - 0.2))} className="p-2 hover:bg-zinc-800 rounded"><ZoomOut size={16}/></button>
           <span className="text-xs font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
           <button onClick={() => setZoom(z => Math.min(5, z + 0.2))} className="p-2 hover:bg-zinc-800 rounded"><ZoomIn size={16}/></button>
           <div className="w-[1px] h-4 bg-zinc-700 mx-1"></div>
           <button onClick={() => {setZoom(1); setPan({x:0,y:0});}} className="p-2 hover:bg-zinc-800 rounded text-xs">Fit</button>
        </div>

        <div className="absolute top-6 left-6 flex items-center gap-2 bg-zinc-950/90 backdrop-blur p-2 rounded-lg border border-zinc-700 shadow-xl opacity-50 group-hover:opacity-100 transition-opacity">
           <button onClick={() => historyIndex > 0 && setHistoryIndex(i=>i-1) || setState(history[historyIndex-1])} disabled={historyIndex <= 0} className="p-2 hover:bg-zinc-800 rounded disabled:opacity-30"><Undo2 size={16}/></button>
           <button onClick={() => historyIndex < history.length - 1 && setHistoryIndex(i=>i+1) || setState(history[historyIndex+1])} disabled={historyIndex >= history.length - 1} className="p-2 hover:bg-zinc-800 rounded disabled:opacity-30"><Redo2 size={16}/></button>
        </div>
      </div>

      <EditorToolbar 
        state={state} 
        updateState={updateState} 
        activeTool={activeTool} 
        setActiveTool={setActiveTool} 
        onReset={() => setState(history[0])}
        onComplete={() => {
            // EXPORT CLEAN DESIGN: Use contentCanvasRef if available to avoid fabric background
            if (contentCanvasRef.current) {
                onComplete(contentCanvasRef.current.toDataURL('image/png'));
            } else if (canvasRef.current) {
                onComplete(canvasRef.current.toDataURL('image/png'));
            }
        }}
        onBack={onBack}
        onGenerativeFill={handleGenerativeFill}
        getCanvas={getContentCanvas}
      />
    </div>
  );
};

export default Editor;
