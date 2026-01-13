import React, { useState, useEffect } from 'react';
import { getEntriesForMonth, getMonthsForYear, exportMonthToDoc, updateEntry, getEntriesForYear } from '../services/storageService';
import { DiaryEntry, MONTH_NAMES } from '../types';
import { ChevronLeft, Download, Calendar, PieChart, Pencil, Save, X, RefreshCw } from 'lucide-react';
import StatsView from './StatsView';

interface ReadingStreamProps {
  year: number;
  onBack: () => void;
  refreshTrigger: number; // New Prop to trigger re-fetch
}

// Simple Markdown Parser for display
const FormattedContent: React.FC<{ content: string }> = ({ content }) => {
  const parts = content.split(/(\*\*.*?\*\*|<u>.*?<\/u>)/g);
  return (
    <span className="whitespace-pre-wrap leading-loose">
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('<u>') && part.endsWith('</u>')) {
          return <u key={index} className="decoration-muted-gold decoration-2 underline-offset-4">{part.slice(3, -4)}</u>;
        }
        return part;
      })}
    </span>
  );
};

const ReadingStream: React.FC<ReadingStreamProps> = ({ year, onBack, refreshTrigger }) => {
  const [viewState, setViewState] = useState<'stream' | 'stats'>('stream');
  const [activeMonth, setActiveMonth] = useState<number | null>(null);
  const [availableMonths, setAvailableMonths] = useState<number[]>([]);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [allYearEntries, setAllYearEntries] = useState<DiaryEntry[]>([]);
  
  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Internal Refresh trigger (combines with prop trigger)
  const [internalVersion, setInternalVersion] = useState(0);

  // Load available months
  useEffect(() => {
    const months = getMonthsForYear(year);
    setAvailableMonths(months);
    
    // Default to latest month if not in stats mode and no month selected
    if (viewState === 'stream') {
        if (months.length > 0) {
            // Keep current selection if valid, otherwise select latest
            if (activeMonth === null || !months.includes(activeMonth)) {
                setActiveMonth(months[months.length - 1]);
            }
        } else {
            setActiveMonth(null);
        }
    }
    
    // For Stats: Load all year data
    setAllYearEntries(getEntriesForYear(year));

  }, [year, viewState, internalVersion, refreshTrigger]); // Added refreshTrigger dependency

  // Load entries for specific month
  useEffect(() => {
    if (activeMonth !== null && viewState === 'stream') {
      const data = getEntriesForMonth(year, activeMonth);
      setEntries(data);
    } else {
      setEntries([]);
    }
  }, [year, activeMonth, viewState, internalVersion, refreshTrigger]); // Added refreshTrigger dependency

  const handleDownload = () => {
    if (activeMonth) exportMonthToDoc(year, activeMonth);
  };

  const handleManualRefresh = () => {
    setInternalVersion(v => v + 1);
  };

  const startEditing = (entry: DiaryEntry) => {
    setEditingId(entry.id);
    setEditContent(entry.content);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditContent('');
  };

  const saveEdit = (id: string) => {
    updateEntry(id, editContent);
    setEditingId(null);
    setInternalVersion(v => v + 1); // Trigger reload locally
  };

  return (
    <div className="flex flex-col h-full bg-cosmic-latte transition-colors duration-500 overflow-hidden">
      {/* Top Navigation */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-muted-gold/10 bg-white/40 backdrop-blur-md sticky top-0 z-10 shrink-0">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-charcoal transition-colors font-serif group"
        >
          <div className="p-1 rounded-full group-hover:bg-black/5 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </div>
          <span className="text-sm tracking-wide">Library</span>
        </button>

        <h2 className="text-lg font-serif font-bold text-charcoal tracking-widest">
          {year}
        </h2>

        <div className="w-20" /> 
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-24 md:w-48 border-r border-muted-gold/10 flex flex-col bg-warm-grey/40 shrink-0">
          <div className="flex-1 overflow-y-auto py-8">
            <div className="flex flex-col gap-2 px-4">
                {availableMonths.length > 0 ? (
                    availableMonths.map((monthIndex) => {
                    const isActive = activeMonth === monthIndex && viewState === 'stream';
                    const name = MONTH_NAMES[monthIndex - 1];
                    return (
                        <button
                        key={monthIndex}
                        onClick={() => {
                            setViewState('stream');
                            setActiveMonth(monthIndex);
                        }}
                        className={`text-left px-4 py-3 rounded-lg transition-all font-serif text-sm md:text-base ${
                            isActive
                            ? 'bg-white shadow-sm text-charcoal font-bold'
                            : 'text-gray-400 hover:text-gray-600 hover:bg-black/5'
                        }`}
                        >
                        <span className="hidden md:inline">{name}</span>
                        <span className="md:hidden">{name.substring(0, 3)}</span>
                        </button>
                    );
                    })
                ) : (
                    <div className="text-xs text-gray-300 text-center italic mt-10">Empty</div>
                )}
            </div>
          </div>
          
          {/* Stats Entry Point */}
          <div className="p-4 border-t border-muted-gold/10 bg-white/30 shrink-0">
            <button
                onClick={() => setViewState('stats')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-serif text-sm ${
                    viewState === 'stats' 
                    ? 'bg-charcoal text-white shadow-md' 
                    : 'text-gray-500 hover:bg-white hover:text-charcoal'
                }`}
            >
                <PieChart className="w-4 h-4" />
                <span className="hidden md:inline tracking-wide">Insights</span>
            </button>
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-12 relative bg-cosmic-latte scroll-smooth">
          <div className="max-w-2xl mx-auto min-h-[500px]">
            
            {viewState === 'stats' ? (
                <StatsView year={year} entries={allYearEntries} />
            ) : (
                <>
                {activeMonth !== null ? (
                    <>
                    {/* Header */}
                    <div className="flex items-end justify-between mb-12 border-b border-muted-gold/20 pb-4">
                        <div>
                            <h3 className="text-4xl font-serif text-charcoal mb-1">
                            {MONTH_NAMES[activeMonth - 1]}
                            </h3>
                            <p className="text-xs text-muted-gold tracking-[0.2em] uppercase">
                            {entries.length} Entries
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {/* Refresh Button */}
                             <button 
                                onClick={handleManualRefresh}
                                className="group flex items-center gap-2 px-3 py-2 rounded-full border border-muted-gold/40 hover:bg-white hover:shadow-md cursor-pointer transition-all"
                                title="Refresh List"
                            >
                                <RefreshCw className="w-4 h-4 text-gray-500 group-hover:text-charcoal" />
                            </button>

                            {/* Download Button */}
                            <button 
                                onClick={handleDownload}
                                disabled={entries.length === 0}
                                className={`group flex items-center gap-2 px-4 py-2 rounded-full border border-muted-gold/40 transition-all ${
                                entries.length === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white hover:shadow-md cursor-pointer'
                                }`}
                                title="Download as .doc"
                            >
                                <Download className="w-4 h-4 text-gray-500 group-hover:text-charcoal" />
                                <span className="text-xs font-serif text-gray-500 group-hover:text-charcoal">.doc</span>
                            </button>
                        </div>
                    </div>

                    {/* Entries List */}
                    <div className="flex flex-col gap-12 pb-24">
                    {entries.length > 0 ? (
                        entries.map((entry) => (
                        <article key={entry.id} className="group relative pl-6 border-l-2 border-muted-gold/20 hover:border-muted-gold transition-colors duration-500">
                            {/* Color Dot Tag */}
                            {entry.colorTag && (
                                <div className={`absolute right-0 top-0 w-3 h-3 rounded-full opacity-60 ${
                                    entry.colorTag === 'red' ? 'bg-tag-red' : 
                                    entry.colorTag === 'yellow' ? 'bg-tag-yellow' : 'bg-tag-green'
                                }`} title={`Mood: ${entry.colorTag}`} />
                            )}

                            {/* Date Decorator */}
                            <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-muted-gold opacity-0 group-hover:opacity-100 transition-opacity" />
                            
                            {/* Entry Header */}
                            <header className="mb-3 flex items-center justify-between group/header">
                                <time className="text-xs font-bold text-gray-400 font-sans tracking-wide">
                                    {entry.formattedDate}
                                </time>
                                
                                {/* Edit Button */}
                                {editingId !== entry.id && (
                                    <button 
                                        onClick={() => startEditing(entry)}
                                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-charcoal transition-all p-1"
                                        title="Edit entry"
                                    >
                                        <Pencil className="w-3 h-3" />
                                    </button>
                                )}
                            </header>

                            {/* Content or Editor */}
                            <div className="prose prose-stone max-w-none">
                                {editingId === entry.id ? (
                                    <div className="animate-in fade-in duration-200">
                                        <textarea
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            className="w-full h-auto min-h-[150px] p-3 bg-white border border-muted-gold/40 rounded-sm font-serif text-lg leading-loose text-charcoal outline-none focus:border-muted-gold focus:ring-1 focus:ring-muted-gold/20 resize-none shadow-inner"
                                            autoFocus
                                        />
                                        <div className="flex items-center gap-2 mt-2 justify-end">
                                            <button 
                                                onClick={cancelEditing}
                                                className="p-2 text-gray-400 hover:text-gray-600"
                                                title="Cancel"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => saveEdit(entry.id)}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-charcoal text-white rounded text-xs tracking-wide hover:shadow-lg transition-all"
                                                title="Save"
                                            >
                                                <Save className="w-3 h-3" />
                                                SAVE
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p 
                                        onDoubleClick={() => startEditing(entry)}
                                        className="font-serif text-lg text-charcoal cursor-text"
                                    >
                                        <FormattedContent content={entry.content} />
                                    </p>
                                )}
                            </div>
                        </article>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 opacity-40">
                        <Calendar className="w-12 h-12 text-muted-gold mb-4" />
                        <p className="font-serif text-lg text-gray-500">No memories recorded.</p>
                        </div>
                    )}
                    </div>
                    
                    {/* End marker */}
                    {entries.length > 0 && (
                    <div className="flex justify-center mt-20 mb-10">
                        <div className="w-16 h-[1px] bg-muted-gold/40"></div>
                    </div>
                    )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-32 opacity-30">
                     <p className="font-serif text-xl text-gray-400 italic">Select a month from the sidebar.</p>
                   </div>
                )}
                </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReadingStream;