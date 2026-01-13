import React, { useMemo } from 'react';
import { DiaryEntry, MONTH_NAMES } from '../types';
import { BarChart3, Type, Smile } from 'lucide-react';

interface StatsViewProps {
  year: number;
  entries: DiaryEntry[];
}

const StatsView: React.FC<StatsViewProps> = ({ year, entries }) => {
  const stats = useMemo(() => {
    let redCount = 0;
    let yellowCount = 0;
    let greenCount = 0;
    let totalChars = 0;
    const monthlyCounts = new Array(12).fill(0);

    entries.forEach(entry => {
      // Tags
      if (entry.colorTag === 'red') redCount++;
      if (entry.colorTag === 'yellow') yellowCount++;
      if (entry.colorTag === 'green') greenCount++;
      
      // Chars
      totalChars += entry.content.length;

      // Monthly
      const monthIndex = new Date(entry.timestamp).getMonth();
      monthlyCounts[monthIndex]++;
    });

    return { redCount, yellowCount, greenCount, totalChars, monthlyCounts };
  }, [entries]);

  const maxMonthCount = Math.max(...stats.monthlyCounts, 1);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-end justify-between mb-12 border-b border-muted-gold/20 pb-4">
        <div>
            <h3 className="text-4xl font-serif text-charcoal mb-1">
            Yearly Insights
            </h3>
            <p className="text-xs text-muted-gold tracking-[0.2em] uppercase">
            {year} Overview
            </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Card 1: Volume */}
        <div className="bg-white/60 p-6 rounded-lg border border-muted-gold/10 shadow-sm flex flex-col items-center justify-center py-10">
            <div className="flex items-center gap-3 mb-2 text-gray-500">
                <Type className="w-5 h-5" />
                <span className="text-xs uppercase tracking-widest">Total Characters</span>
            </div>
            <span className="text-5xl font-serif text-charcoal">{stats.totalChars.toLocaleString()}</span>
            <div className="mt-4 text-sm text-gray-400 font-serif">
                Across {entries.length} memories
            </div>
        </div>

        {/* Card 2: Mood Distribution */}
        <div className="bg-white/60 p-6 rounded-lg border border-muted-gold/10 shadow-sm flex flex-col items-center justify-center py-10">
            <div className="flex items-center gap-3 mb-6 text-gray-500">
                <Smile className="w-5 h-5" />
                <span className="text-xs uppercase tracking-widest">Mood Spectrum</span>
            </div>
            <div className="flex gap-8 items-end">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-tag-red ring-2 ring-tag-red/30"></div>
                    <span className="font-serif text-xl">{stats.redCount}</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-tag-yellow ring-2 ring-tag-yellow/30"></div>
                    <span className="font-serif text-xl">{stats.yellowCount}</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-tag-green ring-2 ring-tag-green/30"></div>
                    <span className="font-serif text-xl">{stats.greenCount}</span>
                </div>
            </div>
        </div>
      </div>

      {/* Chart: Monthly Activity */}
      <div className="bg-white/60 p-8 rounded-lg border border-muted-gold/10 shadow-sm">
        <div className="flex items-center gap-3 mb-8 text-gray-500">
            <BarChart3 className="w-5 h-5" />
            <span className="text-xs uppercase tracking-widest">Activity Flow</span>
        </div>
        
        <div className="flex items-end justify-between gap-2 h-48 w-full px-2">
            {stats.monthlyCounts.map((count, index) => {
                const heightPercentage = (count / maxMonthCount) * 100;
                // Calculate visual height but ensure non-zero items have significant height
                const visualHeight = count === 0 ? 0 : Math.max(heightPercentage, 10); 
                
                return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                        <div className="relative w-full flex items-end justify-center" style={{height: '100%'}}>
                            {/* Bar Container */}
                             <div 
                                style={{ height: `${visualHeight}%` }} 
                                className={`w-full max-w-[24px] rounded-t-sm transition-all duration-500 relative ${
                                    count > 0 ? 'bg-muted-gold opacity-80' : 'bg-muted-gold/10 h-[2px]'
                                }`}
                             >
                                {/* Number Label - Always visible if > 0 */}
                                {count > 0 && (
                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-sm font-bold text-charcoal font-serif">
                                        {count}
                                    </div>
                                )}
                             </div>
                        </div>
                        <span className={`text-[10px] uppercase font-sans tracking-wide ${count > 0 ? 'text-charcoal font-bold' : 'text-gray-300'}`}>
                            {MONTH_NAMES[index].substring(0, 3)}
                        </span>
                    </div>
                )
            })}
        </div>
      </div>
    </div>
  );
};

export default StatsView;