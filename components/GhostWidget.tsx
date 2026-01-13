import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Send, X, PenTool, Bold, Underline, Type } from 'lucide-react';
import { saveEntry } from '../services/storageService';
import { ColorTag } from '../types';

interface GhostWidgetProps {
  onEntrySaved: () => void;
  isStandalone?: boolean; // New prop for Ghost Mode
}

const GhostWidget: React.FC<GhostWidgetProps> = ({ onEntrySaved, isStandalone = false }) => {
  const [isOpen, setIsOpen] = useState(isStandalone);
  const [text, setText] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [useSansFont, setUseSansFont] = useState(false);
  const [selectedColor, setSelectedColor] = useState<ColorTag | undefined>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Force open if standalone
  useEffect(() => {
    if (isStandalone) setIsOpen(true);
  }, [isStandalone]);

  const handleSubmit = useCallback(() => {
    if (!text.trim()) return;
    
    setIsAnimating(true);
    // Simulate slight network/disk delay for realism
    setTimeout(() => {
      saveEntry(text, selectedColor);
      setText('');
      setSelectedColor(undefined);
      setIsAnimating(false);
      onEntrySaved();
      
      if (!isStandalone) {
        setIsOpen(false);
      } else {
        // In standalone mode, maybe show a "Saved!" toast, but keep window open or close it?
        // For now, let's keep it open for rapid entry, or user can close window.
        // Optional: window.close() if it was a popup, but safer to just clear.
      }
    }, 600);
  }, [text, selectedColor, onEntrySaved, isStandalone]);

  const insertFormat = (tag: 'bold' | 'underline') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = text.substring(start, end);
    let newText = '';

    if (tag === 'bold') {
      newText = text.substring(0, start) + `**${selectedText}**` + text.substring(end);
    } else if (tag === 'underline') {
      newText = text.substring(0, start) + `<u>${selectedText}</u>` + text.substring(end);
    }

    setText(newText);
    textarea.focus();
  };

  // 1. Render the Trigger Button (Only if NOT standalone and NOT open)
  if (!isOpen && !isStandalone) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-white/60 backdrop-blur-md border border-white/50 rounded-full shadow-lg flex items-center justify-center hover:bg-white/80 transition-all duration-300 hover:scale-110 group z-50"
        title="Open Ghost Widget"
      >
        <PenTool className="w-6 h-6 text-charcoal opacity-70 group-hover:opacity-100" />
      </button>
    );
  }

  // Styles based on mode
  const containerClasses = isStandalone
    ? "relative w-full h-full bg-[#F9F9F9] flex flex-col p-4" // Standalone: Full screen, simple bg
    : "relative w-[320px] md:w-[450px] min-h-[250px] bg-[#F9F9F9]/90 backdrop-blur-xl border border-white/60 rounded-xl shadow-2xl p-6 flex flex-col transition-all animate-in fade-in zoom-in-95 duration-200"; // Widget: Floating card

  const wrapperClasses = isStandalone
    ? "fixed inset-0 z-50 bg-white" // Standalone: No dark overlay
    : "fixed inset-0 z-50 flex items-center justify-center bg-black/5 backdrop-blur-[2px]"; // Widget: Dark overlay

  return (
    <div className={wrapperClasses}>
      <div className={containerClasses}>
        
        {/* Header */}
        <div className="flex justify-between items-center mb-4 shrink-0">
          <div className="flex items-center gap-3">
             <span className="text-xs font-serif font-bold text-gray-400 tracking-widest uppercase">
                {isStandalone ? 'Ghost Mode' : 'New Memory'}
             </span>
             
             {/* Font Toggle */}
             <button 
               onClick={() => setUseSansFont(!useSansFont)}
               className={`p-1 rounded transition-colors ${useSansFont ? 'bg-gray-200 text-charcoal' : 'text-gray-400 hover:text-charcoal'}`}
               title={useSansFont ? "Switch to Serif" : "Switch to YaHei"}
             >
               <Type className="w-3.5 h-3.5" />
             </button>
          </div>

          {!isStandalone ? (
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-black/5 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
          ) : (
             // In standalone, maybe a close button that tries to close window?
             // Or just nothing to keep it clean.
             null
          )}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-2 shrink-0">
            <button onClick={() => insertFormat('bold')} className="p-1.5 text-gray-400 hover:text-charcoal hover:bg-black/5 rounded" title="Bold">
                <Bold className="w-4 h-4" />
            </button>
            <button onClick={() => insertFormat('underline')} className="p-1.5 text-gray-400 hover:text-charcoal hover:bg-black/5 rounded" title="Underline">
                <Underline className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-gray-300 mx-1"></div>
            
            {/* Color Tags */}
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setSelectedColor(selectedColor === 'red' ? undefined : 'red')}
                    className={`w-3 h-3 rounded-full transition-all duration-200 ${selectedColor === 'red' ? 'bg-tag-red scale-125 ring-2 ring-offset-1 ring-tag-red/30' : 'bg-tag-red/50 hover:bg-tag-red'}`} 
                />
                <button 
                    onClick={() => setSelectedColor(selectedColor === 'yellow' ? undefined : 'yellow')}
                    className={`w-3 h-3 rounded-full transition-all duration-200 ${selectedColor === 'yellow' ? 'bg-tag-yellow scale-125 ring-2 ring-offset-1 ring-tag-yellow/30' : 'bg-tag-yellow/50 hover:bg-tag-yellow'}`} 
                />
                <button 
                    onClick={() => setSelectedColor(selectedColor === 'green' ? undefined : 'green')}
                    className={`w-3 h-3 rounded-full transition-all duration-200 ${selectedColor === 'green' ? 'bg-tag-green scale-125 ring-2 ring-offset-1 ring-tag-green/30' : 'bg-tag-green/50 hover:bg-tag-green'}`} 
                />
            </div>
        </div>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Capture the moment..."
          className={`w-full flex-grow bg-transparent border-none resize-none outline-none text-charcoal text-lg placeholder-gray-400 leading-relaxed ${useSansFont ? 'font-sans' : 'font-serif'}`}
          style={{ minHeight: isStandalone ? 'auto' : '120px' }}
        />

        {/* Footer Actions */}
        <div className="flex justify-end mt-4 pt-4 border-t border-gray-200/50 shrink-0">
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || isAnimating}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
              text.trim() 
                ? 'bg-charcoal text-white shadow-lg hover:shadow-xl' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <span className="text-xs font-medium tracking-wide">
              {isAnimating ? 'SAVING...' : 'KEEP'}
            </span>
            {!isAnimating && <Send className="w-3 h-3" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GhostWidget;