import React, { useState, useEffect, useRef } from 'react';
import {
  getEntriesForMonth, getMonthsForYear, exportMonthToDoc,
  updateEntry, deleteEntry, getEntriesForYear, searchEntries,
} from '../services/storageService';
import { DiaryEntry, MONTH_NAMES } from '../types';
import {
  ChevronLeft, Download, Calendar, PieChart,
  Pencil, Save, X, RefreshCw, Trash2, Search,
} from 'lucide-react';
import StatsView from './StatsView';

interface ReadingStreamProps {
  year: number;
  onBack: () => void;
  refreshTrigger: number;
}

// ── Inline renderer: bold, italic, underline, strikethrough, inline code ──
const renderInline = (text: string, keyPrefix: string): React.ReactNode[] => {
  const parts = text.split(/(\*\*[^*]+?\*\*|\*[^*]+?\*|~~.+?~~|`[^`]+?`|<u>.+?<\/u>)/g);
  return parts.map((part, i) => {
    const k = `${keyPrefix}-${i}`;
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={k} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={k} className="italic">{part.slice(1, -1)}</em>;
    if (part.startsWith('~~') && part.endsWith('~~'))
      return <s key={k} className="opacity-40">{part.slice(2, -2)}</s>;
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={k} className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-charcoal">{part.slice(1, -1)}</code>;
    if (part.startsWith('<u>') && part.endsWith('</u>'))
      return <u key={k} className="decoration-muted-gold decoration-2 underline-offset-4">{part.slice(3, -4)}</u>;
    return <React.Fragment key={k}>{part}</React.Fragment>;
  });
};

// ── Full markdown renderer: headings (#/##/###), lists (- /*), inline ──
const FormattedContent: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  return (
    <div className="leading-loose">
      {lines.map((line, idx) => {
        if (line.startsWith('# '))
          return <h1 key={idx} className="text-2xl font-serif font-bold text-charcoal mt-4 mb-1">{line.slice(2)}</h1>;
        if (line.startsWith('## '))
          return <h2 key={idx} className="text-xl font-serif font-bold text-charcoal mt-3 mb-1">{line.slice(3)}</h2>;
        if (line.startsWith('### '))
          return <h3 key={idx} className="text-lg font-serif font-semibold text-charcoal mt-2 mb-0.5">{line.slice(4)}</h3>;
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <div key={idx} className="flex gap-2 my-0.5">
              <span className="text-muted-gold select-none shrink-0 mt-0.5">•</span>
              <span>{renderInline(line.slice(2), `${idx}`)}</span>
            </div>
          );
        if (line === '') return <div key={idx} className="h-2" />;
        return <div key={idx}>{renderInline(line, `${idx}`)}</div>;
      })}
    </div>
  );
};

// ── Search snippet with highlighted match ──
const SearchSnippet: React.FC<{ content: string; query: string }> = ({ content, query }) => {
  const idx = content.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span className="text-sm text-gray-400 font-serif">{content.slice(0, 80)}…</span>;
  const before = content.slice(Math.max(0, idx - 25), idx);
  const match = content.slice(idx, idx + query.length);
  const after = content.slice(idx + query.length, idx + query.length + 80);
  return (
    <span className="text-sm font-serif text-gray-500">
      {idx > 25 && '…'}{before}
      <mark className="bg-muted-gold/40 text-charcoal px-0.5 rounded not-italic">{match}</mark>
      {after}{after.length >= 80 && '…'}
    </span>
  );
};

const ReadingStream: React.FC<ReadingStreamProps> = ({ year, onBack, refreshTrigger }) => {
  const [viewState, setViewState] = useState<'stream' | 'stats'>('stream');
  const [activeMonth, setActiveMonth] = useState<number | null>(null);
  const [availableMonths, setAvailableMonths] = useState<number[]>([]);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [allYearEntries, setAllYearEntries] = useState<DiaryEntry[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<DiaryEntry[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [internalVersion, setInternalVersion] = useState(0);

  useEffect(() => {
    const months = getMonthsForYear(year);
    setAvailableMonths(months);
    if (viewState === 'stream') {
      if (months.length > 0) {
        if (activeMonth === null || !months.includes(activeMonth)) {
          setActiveMonth(months[months.length - 1]);
        }
      } else {
        setActiveMonth(null);
      }
    }
    setAllYearEntries(getEntriesForYear(year));
  }, [year, viewState, internalVersion, refreshTrigger]);

  useEffect(() => {
    if (activeMonth !== null && viewState === 'stream') {
      setEntries(getEntriesForMonth(year, activeMonth));
    } else {
      setEntries([]);
    }
  }, [year, activeMonth, viewState, internalVersion, refreshTrigger]);

  useEffect(() => {
    if (searchQuery.trim()) {
      setSearchResults(searchEntries(searchQuery));
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleDownload = () => { if (activeMonth) exportMonthToDoc(year, activeMonth); };
  const handleManualRefresh = () => setInternalVersion(v => v + 1);

  const startEditing = (entry: DiaryEntry) => {
    setDeletingId(null);
    setEditingId(entry.id);
    setEditContent(entry.content);
  };
  const cancelEditing = () => { setEditingId(null); setEditContent(''); };
  const saveEdit = (id: string) => {
    updateEntry(id, editContent);
    setEditingId(null);
    setInternalVersion(v => v + 1);
    if (searchQuery) setSearchResults(searchEntries(searchQuery));
  };
  const confirmDelete = (id: string) => {
    deleteEntry(id);
    setDeletingId(null);
    setInternalVersion(v => v + 1);
    if (searchQuery) setSearchResults(searchEntries(searchQuery));
  };

  const openSearch = () => {
    setIsSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };
  const closeSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const isSearching = isSearchOpen && searchQuery.trim().length > 0;

  const renderEntry = (entry: DiaryEntry, inSearch = false) => (
    <article key={entry.id} className="group relative pl-6 border-l-2 border-muted-gold/20 hover:border-muted-gold transition-colors duration-500">
      {entry.colorTag && (
        <div className={`absolute right-0 top-0 w-3 h-3 rounded-full opacity-60 ${
          entry.colorTag === 'red' ? 'bg-tag-red' :
          entry.colorTag === 'yellow' ? 'bg-tag-yellow' : 'bg-tag-green'
        }`} title={`Mood: ${entry.colorTag}`} />
      )}
      <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-muted-gold opacity-0 group-hover:opacity-100 transition-opacity" />

      <header className="mb-3 flex items-center justify-between">
        <time className="text-xs font-bold text-gray-400 font-sans tracking-wide">
          {entry.formattedDate}
          {inSearch && (
            <span className="ml-2 text-muted-gold font-normal">
              {new Date(entry.timestamp).getFullYear()}
            </span>
          )}
        </time>
        {editingId !== entry.id && deletingId !== entry.id && (
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all">
            <button onClick={() => startEditing(entry)} className="text-gray-300 hover:text-charcoal transition-all p-1" title="Edit">
              <Pencil className="w-3 h-3" />
            </button>
            <button onClick={() => setDeletingId(entry.id)} className="text-gray-300 hover:text-red-400 transition-all p-1" title="Delete">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </header>

      <div className="prose prose-stone max-w-none">
        {editingId === entry.id ? (
          <div className="animate-in fade-in duration-200">
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="w-full h-auto min-h-[150px] p-3 bg-white border border-muted-gold/40 rounded-sm font-serif text-lg leading-loose text-charcoal outline-none focus:border-muted-gold focus:ring-1 focus:ring-muted-gold/20 resize-none shadow-inner"
              autoFocus
            />
            <div className="flex items-center gap-2 mt-2 justify-end">
              <button onClick={cancelEditing} className="p-2 text-gray-400 hover:text-gray-600" title="Cancel">
                <X className="w-4 h-4" />
              </button>
              <button onClick={() => saveEdit(entry.id)} className="flex items-center gap-2 px-3 py-1.5 bg-charcoal text-white rounded text-xs tracking-wide hover:shadow-lg transition-all">
                <Save className="w-3 h-3" /> SAVE
              </button>
            </div>
          </div>
        ) : deletingId === entry.id ? (
          <div className="animate-in fade-in duration-150 py-2">
            <p className="text-sm font-serif text-gray-400 mb-3 italic">Delete this entry? This cannot be undone.</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setDeletingId(null)} className="px-3 py-1.5 text-xs font-serif text-gray-500 border border-gray-200 rounded hover:bg-gray-50 transition-all">
                Cancel
              </button>
              <button onClick={() => confirmDelete(entry.id)} className="px-3 py-1.5 text-xs font-serif text-white bg-red-400 hover:bg-red-500 rounded transition-all">
                Delete
              </button>
            </div>
          </div>
        ) : (
          <p onDoubleClick={() => startEditing(entry)} className="font-serif text-lg text-charcoal cursor-text">
            {inSearch
              ? <SearchSnippet content={entry.content} query={searchQuery} />
              : <FormattedContent content={entry.content} />
            }
          </p>
        )}
      </div>
    </article>
  );

  return (
    <div className="flex flex-col h-full bg-cosmic-latte transition-colors duration-500 overflow-hidden">

      {/* Top Navigation */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-muted-gold/10 bg-white/40 backdrop-blur-md sticky top-0 z-10 shrink-0">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-charcoal transition-colors font-serif group">
          <div className="p-1 rounded-full group-hover:bg-black/5 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </div>
          <span className="text-sm tracking-wide">Library</span>
        </button>

        <h2 className="text-lg font-serif font-bold text-charcoal tracking-widest">{year}</h2>

        <div className="flex items-center gap-2">
          {isSearchOpen ? (
            <div className="flex items-center gap-2 bg-white/70 border border-muted-gold/30 rounded-full px-3 py-1.5 shadow-sm">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search memories…"
                className="bg-transparent outline-none text-sm font-serif text-charcoal placeholder-gray-300 w-36 md:w-48"
              />
              <button onClick={closeSearch} className="text-gray-300 hover:text-gray-500 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button onClick={openSearch} className="p-2 text-gray-400 hover:text-charcoal hover:bg-black/5 rounded-full transition-all" title="Search">
              <Search className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-24 md:w-48 border-r border-muted-gold/10 flex flex-col bg-warm-grey/40 shrink-0">
          <div className="flex-1 overflow-y-auto py-8">
            <div className="flex flex-col gap-2 px-4">
              {availableMonths.length > 0 ? (
                availableMonths.map(monthIndex => {
                  const isActive = activeMonth === monthIndex && viewState === 'stream' && !isSearching;
                  const name = MONTH_NAMES[monthIndex - 1];
                  return (
                    <button
                      key={monthIndex}
                      onClick={() => { setViewState('stream'); setActiveMonth(monthIndex); closeSearch(); }}
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

          <div className="p-4 border-t border-muted-gold/10 bg-white/30 shrink-0">
            <button
              onClick={() => { setViewState('stats'); closeSearch(); }}
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

            ) : isSearching ? (
              <>
                <div className="flex items-end justify-between mb-12 border-b border-muted-gold/20 pb-4">
                  <div>
                    <h3 className="text-4xl font-serif text-charcoal mb-1">Search</h3>
                    <p className="text-xs text-muted-gold tracking-[0.2em] uppercase">
                      {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} · "{searchQuery}"
                    </p>
                  </div>
                </div>
                {searchResults.length > 0 ? (
                  <div className="flex flex-col gap-12 pb-24">
                    {searchResults.map(entry => renderEntry(entry, true))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 opacity-40">
                    <Search className="w-12 h-12 text-muted-gold mb-4" />
                    <p className="font-serif text-lg text-gray-500">No memories found.</p>
                  </div>
                )}
              </>

            ) : activeMonth !== null ? (
              <>
                <div className="flex items-end justify-between mb-12 border-b border-muted-gold/20 pb-4">
                  <div>
                    <h3 className="text-4xl font-serif text-charcoal mb-1">{MONTH_NAMES[activeMonth - 1]}</h3>
                    <p className="text-xs text-muted-gold tracking-[0.2em] uppercase">{entries.length} Entries</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleManualRefresh} className="group flex items-center gap-2 px-3 py-2 rounded-full border border-muted-gold/40 hover:bg-white hover:shadow-md cursor-pointer transition-all" title="Refresh List">
                      <RefreshCw className="w-4 h-4 text-gray-500 group-hover:text-charcoal" />
                    </button>
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

                <div className="flex flex-col gap-12 pb-24">
                  {entries.length > 0 ? (
                    entries.map(entry => renderEntry(entry, false))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 opacity-40">
                      <Calendar className="w-12 h-12 text-muted-gold mb-4" />
                      <p className="font-serif text-lg text-gray-500">No memories recorded.</p>
                    </div>
                  )}
                </div>

                {entries.length > 0 && (
                  <div className="flex justify-center mt-20 mb-10">
                    <div className="w-16 h-[1px] bg-muted-gold/40" />
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-32 opacity-30">
                <p className="font-serif text-xl text-gray-400 italic">Select a month from the sidebar.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReadingStream;
