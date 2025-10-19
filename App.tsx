
import React, { useState, useCallback } from 'react';
import { getRotationPrompts, generateRotatedImage } from './services/geminiService';
import { GridCell } from './components/GridCell';
import { ToggleSwitch } from './components/ToggleSwitch';
import { 
  UploadIcon, DownloadIcon, ResetIcon, ObjectIcon, MagnifyingGlassIcon, 
  FrontViewIcon, SideViewIcon, BackViewIcon, TopViewIcon, ThreeQuarterViewIcon, 
  LowAngleIcon, HighAngleIcon 
} from './components/Icons';

// This is required to use JSZip from CDN
declare const JSZip: any;

interface GeneratedImage {
  src: string;
  prompt: string;
}

const angleOptions = [
  { id: 'Three-Quarter', label: 'Three-Quarter', icon: ThreeQuarterViewIcon },
  { id: 'Side', label: 'Side View', icon: SideViewIcon },
  { id: 'Front', label: 'Front View', icon: FrontViewIcon },
  { id: 'Back', label: 'Back View', icon: BackViewIcon },
  { id: 'Low Angle', label: 'Low Angle', icon: LowAngleIcon },
  { id: 'High Angle', label: 'High Angle', icon: HighAngleIcon },
  { id: 'Top', label: 'Top View', icon: TopViewIcon },
  { id: 'Close-up', label: 'Close-up', icon: MagnifyingGlassIcon },
];


const App: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isObjectRotationOnly, setIsObjectRotationOnly] = useState<boolean>(false);
  const [isCloseupOnly, setIsCloseupOnly] = useState<boolean>(false);
  const [selectedAngles, setSelectedAngles] = useState<string[]>(['Three-Quarter', 'Side', 'Back', 'Close-up']);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  const resetState = () => {
    setOriginalImage(null);
    setGeneratedImages([]);
    setIsLoading(false);
    setStatus('');
    setError('');
  };

  const processFileUpload = (file: File) => {
    if (!file || !file.type.startsWith('image/')) {
        setError("Invalid file type. Please upload an image.");
        return;
    }

    if (selectedAngles.length !== 4 && !isCloseupOnly) {
      setError("Please select exactly 4 angles to generate.");
      return;
    }

    resetState();
    setIsLoading(true);
    setStatus('Reading image...');
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Image = (reader.result as string).split(',')[1];
      setOriginalImage(`data:${file.type};base64,${base64Image}`);
      await processImage(base64Image, file.type);
    };
    reader.onerror = () => {
        setError('Failed to read the image file.');
        setIsLoading(false);
        setStatus('');
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFileUpload(file);
    }
  };

  const processImage = async (base64Image: string, mimeType: string) => {
    try {
      setStatus('1/5: Generating prompts...');
      const prompts = await getRotationPrompts(base64Image, mimeType, isObjectRotationOnly, isCloseupOnly, selectedAngles);

      if (!prompts || prompts.length < 4) {
        throw new Error("Could not determine views. Please try another image.");
      }

      const newImages: GeneratedImage[] = [];
      for (let i = 0; i < 4; i++) {
        setStatus(` ${i + 2}/5: Generating view ${i + 1} of 4...`);
        const generatedImage = await generateRotatedImage(base64Image, mimeType, prompts[i]);
        newImages.push({ src: generatedImage, prompt: prompts[i] });
        setGeneratedImages([...newImages]);
      }
      setStatus('Processing complete!');
    } catch (err) {
      console.error(err);
      if (err instanceof Error && (err.message.includes('RESOURCE_EXHAUSTED') || err.message.includes('429'))) {
         setError("Quota exhausted. The free tier for the image model has been used up. Please check your Google AI Studio plan or wait a few hours before trying again.");
      } else {
         setError(err instanceof Error ? err.message : 'An unknown error occurred during processing.');
      }
      setStatus('Failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadZip = async () => {
    if (!originalImage || generatedImages.length < 4) return;

    setStatus('Creating ZIP file...');
    try {
        const zip = new JSZip();
        
        const originalBlob = await fetch(originalImage).then(r => r.blob());
        zip.file("original.png", originalBlob);

        for (let i = 0; i < generatedImages.length; i++) {
            const generatedBlob = await fetch(generatedImages[i].src).then(r => r.blob());
            zip.file(`generated_${generatedImages[i].prompt.substring(0,20).replace(/\s/g, '_')}_${i + 1}.png`, generatedBlob);
        }

        const content = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        // FIX: Changed URL.ObjectURL to URL.createObjectURL.
        link.href = URL.createObjectURL(content);
        link.download = 'generated-images.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setStatus('Download complete!');
    } catch (err) {
        console.error("Failed to create ZIP", err);
        setError("Failed to create ZIP file.");
        setStatus('Failed');
    }
  };

  const handleDragEvents = (e: React.DragEvent<HTMLElement>, isEntering: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading) {
      setIsDraggingOver(isEntering);
    }
  };
  
  const handleDrop = (e: React.DragEvent<HTMLElement>) => {
    handleDragEvents(e, false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFileUpload(file);
    }
  };
  
  const handleAngleSelection = (angleId: string) => {
    setSelectedAngles(prev => {
      const isSelected = prev.includes(angleId);
      if (isSelected) {
        return prev.filter(a => a !== angleId);
      } else {
        if (prev.length < 4) {
          return [...prev, angleId];
        }
        return prev;
      }
    });
  };

  const isFinished = !isLoading && generatedImages.length === 4;
  const canUpload = !isLoading && (isCloseupOnly || selectedAngles.length === 4);

  return (
    <div className="min-h-screen bg-black text-zinc-200 font-sans">
      <div className="w-full max-w-5xl mx-auto p-4 sm:p-8">
        <header className="text-center mb-10">
          <h1 className="text-4xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-zinc-200 to-zinc-500 tracking-tight">AI Object Rotator</h1>
          <p className="text-lg text-zinc-400 mt-2">Generate new perspectives of any image</p>
        </header>

        <main className="flex flex-col gap-8">
          <section className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6">
            <h2 className="text-xl font-semibold mb-5 text-zinc-100">1. Customize Your Shot</h2>
            <div className="flex flex-col gap-6">
              <div>
                <label className="text-zinc-400 font-medium mb-3 block">
                  Choose 4 Angles
                  <span className={`ml-2 text-sm font-normal ${selectedAngles.length === 4 || isCloseupOnly ? 'text-green-400' : 'text-yellow-400'}`}>
                    ({selectedAngles.length}/4 selected)
                  </span>
                </label>
                <div className={`transition-opacity duration-300 ${isCloseupOnly ? 'opacity-40' : ''}`}>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                    {angleOptions.map((angle) => {
                      const isSelected = selectedAngles.includes(angle.id);
                      const isMaxed = selectedAngles.length >= 4 && !isSelected;
                      return (
                        <button 
                          key={angle.id}
                          onClick={() => handleAngleSelection(angle.id)}
                          disabled={isCloseupOnly || isMaxed}
                          className={`flex flex-col items-center justify-center p-3 text-center rounded-xl transition-all duration-200 ${
                            isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-zinc-800 text-zinc-300'
                          } ${
                            (isCloseupOnly || isMaxed) ? 'cursor-not-allowed' : 'hover:bg-zinc-700'
                          }`}
                        >
                          <angle.icon className="w-6 h-6 mb-1.5" />
                          <span className="text-xs font-semibold">{angle.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-zinc-400 font-medium mb-3 block">Options</label>
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-zinc-800/80 p-3 rounded-xl">
                      <label htmlFor="rotate-object-only" className="flex items-center text-zinc-100 font-medium cursor-pointer">
                          <ObjectIcon className="w-5 h-5 mr-3 text-zinc-400" />
                          Isolate Object on White Background
                      </label>
                      <ToggleSwitch id="rotate-object-only" checked={isObjectRotationOnly} onChange={setIsObjectRotationOnly} disabled={isLoading} />
                  </div>
                   <div className="flex justify-between items-center bg-zinc-800/80 p-3 rounded-xl">
                      <label htmlFor="close-up-only" className="flex items-center text-zinc-100 font-medium cursor-pointer">
                          <MagnifyingGlassIcon className="w-5 h-5 mr-3 text-zinc-400" />
                          Override: Generate 4 Close-ups
                      </label>
                      <ToggleSwitch id="close-up-only" checked={isCloseupOnly} onChange={setIsCloseupOnly} disabled={isLoading} />
                  </div>
                </div>
              </div>
            </div>
          </section>
          
          <section className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6">
             <h2 className="text-xl font-semibold mb-4 text-zinc-100">2. Upload Image</h2>
            <div 
              className={`relative aspect-video bg-zinc-800/50 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-dashed transition-all duration-300 ${!canUpload ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-500'} ${isDraggingOver ? 'border-blue-500 scale-105 bg-zinc-700/50' : 'border-zinc-700'}`}
              onDragEnter={(e) => canUpload && handleDragEvents(e, true)}
              onDragOver={(e) => canUpload && handleDragEvents(e, true)}
              onDragLeave={(e) => canUpload && handleDragEvents(e, false)}
              onDrop={canUpload ? handleDrop : e => e.preventDefault()}
            >
              {!originalImage ? (
                  <label 
                    htmlFor="file-upload" 
                    className={`flex flex-col items-center justify-center text-center p-4 w-full h-full rounded-2xl ${canUpload ? 'cursor-pointer' : ''}`}
                  >
                      <UploadIcon className="w-10 h-10 text-zinc-500 mb-3" />
                      <span className="font-semibold text-zinc-100">{isDraggingOver ? "Drop image to upload" : (canUpload ? "Upload an Image" : "Please select 4 angles first")}</span>
                      <span className="text-sm text-zinc-400">{canUpload && !isDraggingOver && "or tap to select a file"}</span>
                      <input id="file-upload" type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={!canUpload} />
                  </label>
              ) : (
                <img src={originalImage} alt="Original upload" className="w-full h-full object-contain rounded-2xl p-2" />
              )}
            </div>
          </section>

          <section>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-5 gap-4">
              <h2 className="text-xl font-semibold text-zinc-100">3. Results</h2>
              {isFinished && (
                <div className="flex items-center gap-3">
                  <button onClick={resetState} className="flex items-center justify-center px-5 py-2 bg-zinc-700 hover:bg-zinc-600 text-white font-bold rounded-full transition-colors duration-200">
                    <ResetIcon className="w-5 h-5 mr-2" />
                    New Project
                  </button>
                  <button onClick={handleDownloadZip} className="flex items-center justify-center px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full transition-colors duration-200">
                    <DownloadIcon className="w-5 h-5 mr-2" />
                    Download ZIP
                  </button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {[...Array(4)].map((_, i) => (
                <GridCell key={i} prompt={generatedImages[i]?.prompt} src={generatedImages[i]?.src} index={i}>
                  {isLoading && !generatedImages[i] && (
                    <div className="flex flex-col items-center justify-center w-full h-full">
                      <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-xs mt-2 text-zinc-400">{isCloseupOnly ? 'Close-up' : selectedAngles[i]}</span>
                    </div>
                  )}
                  {generatedImages[i] && (
                    <img src={generatedImages[i].src} alt={`Generated view ${i+1}`} className="w-full h-full object-contain rounded-2xl" />
                  )}
                </GridCell>
              ))}
            </div>
          </section>
          
          {(isLoading || status || error) && (
              <div className="mt-2 text-center p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
                  {error ? (
                    <p className="text-red-400 font-medium">{error}</p>
                  ) : (
                    <p className="text-blue-300">{status}</p>
                  )}
              </div>
          )}
        </main>
        <footer className="text-center py-4 mt-12">
          <p className="text-sm text-zinc-500">
            Made by <a href="https://t.me/denissexy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Denis Sexy IT</a>
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
