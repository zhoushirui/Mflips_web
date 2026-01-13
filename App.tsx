import React, { useState, useEffect } from 'react';
import GhostWidget from './components/GhostWidget';
import Bookshelf from './components/Bookshelf';
import ReadingStream from './components/ReadingStream';
import { ViewMode } from './types';
import { getYears } from './services/storageService';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.BOOKSHELF);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [years, setYears] = useState<number[]>([]);
  // Use a trigger to refresh data when new entry is added
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load available years on mount and when data changes
  useEffect(() => {
    setYears(getYears());
  }, [refreshTrigger]);

  const handleEntrySaved = () => {
    // Increment trigger to notify children to reload
    setRefreshTrigger(prev => prev + 1);
  };

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    setViewMode(ViewMode.STREAM);
  };

  const handleBackToShelf = () => {
    setViewMode(ViewMode.BOOKSHELF);
  };

  return (
    // changed h-screen to h-[100dvh] for better mobile/safari support
    <div className="relative w-full h-[100dvh] overflow-hidden flex flex-col font-serif text-charcoal bg-cosmic-latte selection:bg-muted-gold/30">
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative z-0 h-full overflow-hidden">
        {viewMode === ViewMode.BOOKSHELF ? (
          <Bookshelf 
            years={years} 
            onYearSelect={handleYearSelect} 
            onDataChange={handleEntrySaved} // Pass handler to refresh years after import
          />
        ) : (
          <ReadingStream 
            year={selectedYear} 
            onBack={handleBackToShelf} 
            refreshTrigger={refreshTrigger} // Pass refresh signal
          />
        )}
      </main>

      {/* Ghost Widget - Always accessible */}
      <GhostWidget onEntrySaved={handleEntrySaved} />

    </div>
  );
};

export default App;