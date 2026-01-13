import React, { useRef, useState, useEffect } from 'react';
import { Book, UploadCloud, Loader2, CheckCircle2, Download } from 'lucide-react';
import { importFromDoc } from '../services/storageService';

interface BookshelfProps {
  years: number[];
  onYearSelect: (year: number) => void;
  onDataChange: () => void; // Callback to trigger app refresh
}

const Bookshelf: React.FC<BookshelfProps> = ({ years, onYearSelect, onDataChange }) => {
  const hasYears = years.length > 0;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  
  // State for PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Listen for the 'beforeinstallprompt' event
    const handler = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus(null);
    
    // Tiny delay to show loading state
    setTimeout(async () => {
        try {
            const count = await importFromDoc(file);
            setImportStatus(`Restored ${count} memories`);
            if (count > 0) {
                onDataChange(); // Refresh parent data
            }
        } catch (error) {
            setImportStatus("Import failed");
        } finally {
            setIsImporting(false);
            // Clear status after a few seconds
            setTimeout(() => setImportStatus(null), 3000);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }, 800);
  };

  return (
    <div className="flex-1 p-8 md:p-16 overflow-y-auto bg-cosmic-latte">
      <div className="max-w-4xl mx-auto">
        {/* Header with Actions */}
        <div className="flex items-end justify-between mb-12 border-b border-muted-gold/30 pb-4">
            <h1 className="text-3xl font-serif text-charcoal tracking-wide">
            The Library
            </h1>

            <div className="flex items-center gap-6">
                {/* Install App Button (Only shows if installable) */}
                {deferredPrompt && (
                    <button 
                        onClick={handleInstallClick}
                        className="flex items-center gap-2 text-xs font-sans font-bold text-charcoal/70 hover:text-charcoal cursor-pointer transition-colors uppercase tracking-widest group bg-white/50 px-3 py-1.5 rounded-full hover:bg-white border border-transparent hover:border-muted-gold/20"
                    >
                        <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span>Install App</span>
                    </button>
                )}

                {/* Import Button */}
                <div className="flex flex-col items-end">
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        accept=".doc,.html" 
                        onChange={handleFileChange}
                        className="hidden" 
                    />
                    
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isImporting}
                        className="flex items-center gap-2 text-xs font-sans font-bold text-gray-400 hover:text-charcoal cursor-pointer transition-colors uppercase tracking-widest group"
                    >
                        {isImporting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : importStatus ? (
                            <CheckCircle2 className="w-4 h-4 text-tag-green" />
                        ) : (
                            <UploadCloud className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                        )}
                        <span>
                            {isImporting ? 'Restoring...' : importStatus ? importStatus : 'Restore Backup'}
                        </span>
                    </button>
                </div>
            </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {hasYears && years.map((year) => (
            <button
              key={year}
              onClick={() => onYearSelect(year)}
              className="group flex flex-col items-center justify-center aspect-[3/4] bg-[#FFF] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-muted-gold/10 rounded-[2px] relative overflow-hidden"
            >
              {/* Spine Detail */}
              <div className="absolute left-4 top-0 bottom-0 w-[2px] bg-muted-gold/10 group-hover:bg-muted-gold/30 transition-colors" />
              
              <Book className="w-10 h-10 text-muted-gold mb-6 opacity-70 group-hover:scale-110 group-hover:opacity-100 transition-all duration-500" strokeWidth={1} />
              
              <span className="font-serif text-2xl text-charcoal tracking-widest font-bold">
                {year}
              </span>
              <span className="text-[10px] text-gray-400 mt-2 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                Open Volume
              </span>
            </button>
          ))}
        </div>

        {!hasYears && (
          <div className="mt-20 text-center flex flex-col items-center justify-center opacity-50">
            <Book className="w-16 h-16 text-muted-gold mb-4 opacity-50" strokeWidth={0.5} />
            <p className="text-lg text-gray-400 font-serif italic mb-2">
              Your library is waiting for its first story.
            </p>
            <p className="text-sm text-gray-300 font-sans uppercase tracking-widest">
              Use the pen to begin <br/> or restore a backup
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Bookshelf;