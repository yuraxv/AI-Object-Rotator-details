import React, { useState } from 'react';
import { InfoIcon, CloseIcon, DownloadSimpleIcon } from './Icons';

interface GridCellProps {
  children: React.ReactNode;
  prompt?: string;
  src?: string;
  index?: number;
}

export const GridCell: React.FC<GridCellProps> = ({ children, prompt, src, index }) => {
  const [isPromptVisible, setIsPromptVisible] = useState(false);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!src) return;
    const link = document.createElement('a');
    link.href = src;
    link.download = `generated_${index !== undefined ? index + 1 : 'image'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="group relative aspect-square bg-zinc-900 rounded-3xl overflow-hidden flex items-center justify-center border border-zinc-800">
      {children}
      
      <div className="absolute top-3 right-3 z-10 flex flex-col space-y-2">
        {prompt && (
          <button
            onClick={() => setIsPromptVisible(true)}
            className="p-2 bg-black/40 backdrop-blur-sm rounded-full text-white hover:bg-black/60 transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100"
            aria-label="Show prompt"
          >
            <InfoIcon className="w-5 h-5" />
          </button>
        )}
        {src && (
           <button
            onClick={handleDownload}
            className="p-2 bg-black/40 backdrop-blur-sm rounded-full text-white hover:bg-black/60 transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100"
            aria-label="Download image"
          >
            <DownloadSimpleIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {isPromptVisible && (
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center p-4 z-20 animate-fade-in"
          onClick={() => setIsPromptVisible(false)}
        >
          <div
            className="bg-zinc-900/80 border border-zinc-700 p-5 rounded-2xl max-w-full max-h-full overflow-y-auto text-sm text-zinc-300 relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="font-bold text-white mb-2 uppercase tracking-wider">Generation Prompt</h4>
            <p className="whitespace-pre-wrap">{prompt}</p>
             <button
                onClick={() => setIsPromptVisible(false)}
                className="absolute top-2 right-2 p-1 text-zinc-400 hover:text-white"
                aria-label="Close prompt"
              >
                <CloseIcon className="w-5 h-5" />
             </button>
          </div>
        </div>
      )}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-in-out;
        }
      `}</style>
    </div>
  );
};