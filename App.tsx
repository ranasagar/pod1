
import React, { useState, useEffect, ErrorInfo } from 'react';
import { AppStep, ErrorBoundaryProps, ErrorBoundaryState } from './types';
import Generator from './components/Generator';
import Editor from './components/Editor';
import MockupStudio from './components/MockupStudio';
import AdminPanel from './components/AdminPanel';
import { Shirt, ShieldCheck, AlertOctagon, RefreshCw } from 'lucide-react';

/**
 * ErrorBoundary class component.
 * Extends React.Component to ensure props and state are correctly recognized by TypeScript.
 */
// Fix: Use React.Component to resolve Property 'state' and 'props' not existing errors.
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Uncaught Error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-8 text-center">
          <AlertOctagon className="text-red-500 mb-4" size={48} />
          <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
          <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 font-mono text-xs text-red-300 mb-6 max-w-lg overflow-auto text-left">
            {this.state.error?.message}
          </div>
          <button 
            onClick={() => { localStorage.removeItem('pod_gallery'); window.location.reload(); }} 
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-2"
          >
            <RefreshCw size={18} /> Clear Cache & Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const App = () => {
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.GENERATE);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [gallery, setGallery] = useState<string[]>([]);
  const [adminPin, setAdminPin] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('pod_gallery');
    if (saved) { 
      try { 
        setGallery(JSON.parse(saved)); 
      } catch (e) { 
        localStorage.removeItem('pod_gallery'); 
      } 
    }
  }, []);

  useEffect(() => {
    if (gallery.length > 0) {
      try { 
        localStorage.setItem('pod_gallery', JSON.stringify(gallery)); 
      } catch (e) { 
        try { 
          localStorage.setItem('pod_gallery', JSON.stringify(gallery.slice(0, 3))); 
        } catch (e2) { 
          localStorage.removeItem('pod_gallery'); 
        } 
      }
    }
  }, [gallery]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin === '1234') { 
      setCurrentStep(AppStep.ADMIN); 
      setShowAdminLogin(false); 
      setAdminPin(''); 
    } else { 
      alert("Invalid PIN. Try 1234"); 
    }
  };

  if (currentStep === AppStep.ADMIN) return <AdminPanel onLogout={() => setCurrentStep(AppStep.GENERATE)} />;

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
        <header className="h-16 border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md flex items-center justify-between px-6 lg:px-12 z-10 shrink-0">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentStep(AppStep.GENERATE)}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Shirt size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">POD<span className="text-indigo-400">Studio</span></span>
          </div>
          <div className="flex items-center gap-4">
            {currentStep !== AppStep.GENERATE && (
              <button onClick={() => window.confirm("Start over?") && setCurrentStep(AppStep.GENERATE)} className="text-sm text-zinc-400 hover:text-white">Start Over</button>
            )}
            <div className="relative">
              <button onClick={() => setShowAdminLogin(!showAdminLogin)} className="px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-400 hover:text-white transition-colors">
                <ShieldCheck size={12} className="mr-1"/> Admin
              </button>
              {showAdminLogin && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-3 z-50">
                    <form onSubmit={handleAdminLogin}>
                      <input type="password" autoFocus className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-center text-sm mb-2" value={adminPin} onChange={e => setAdminPin(e.target.value)} maxLength={4}/>
                      <button type="submit" className="w-full py-1 bg-indigo-600 rounded text-xs font-bold hover:bg-indigo-500">Access</button>
                    </form>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className={`flex-1 relative ${currentStep === AppStep.EDIT ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          <div className={`w-full max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8 ${currentStep === AppStep.EDIT ? 'h-full' : 'min-h-full'}`}>
            {currentStep === AppStep.GENERATE && (
              <Generator 
                onImageGenerated={(url) => { setGallery(prev => [url, ...prev].slice(0, 10)); setGeneratedImage(url); setCurrentStep(AppStep.EDIT); }} 
                gallery={gallery} 
                onSelectFromGallery={(url) => { setGeneratedImage(url); setCurrentStep(AppStep.EDIT); }}
              />
            )}
            {currentStep === AppStep.EDIT && generatedImage && (
              <Editor imageUrl={generatedImage} onComplete={(url) => { setProcessedImage(url); setCurrentStep(AppStep.MOCKUP); }} onBack={() => setCurrentStep(AppStep.GENERATE)}/>
            )}
            {currentStep === AppStep.MOCKUP && processedImage && (
              <MockupStudio designUrl={processedImage} onBack={() => setCurrentStep(AppStep.EDIT)}/>
            )}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default App;
