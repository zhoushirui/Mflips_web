import React, { useMemo, useState } from 'react';
import { DiaryEntry, ColorTag, MONTH_NAMES } from '../types';
import { BarChart3, Type, Smile, CalendarDays } from 'lucide-react';

interface StatsViewProps {
  year: number;
  entries: DiaryEntry[];
}

const COLOR_DOT: Record<ColorTag, string> = {
  red: 'bg-tag-red',
  yellow: 'bg-tag-yellow',
  green: 'bg-tag-green',
};

const StatsView: React.FC<StatsViewProps> = ({ year, entries }) => {
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);

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

  const calendarData = useMemo(() => {
    const dayMap = new Map<number, DiaryEntry[]>();
    entries.forEach(e => {
      const d = new Date(e.timestamp);
      if (d.getMonth() + 1 === calMonth) {
        const day = d.getDate();
        if (!dayMap.has(day)) dayMap.set(day, []);
        dayMap.get(day)!.push(e);
      }
    });
    return dayMap;
  }, [entries, calMonth]);

  const firstDay = new Date(year, calMonth - 1, 1).getDay();
  const daysInMonth = new Date(year, calMonth, 0).getDate();

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

      {/* Calendar View */}
      <div className="bg-white/60 p-8 rounded-lg border border-muted-gold/10 shadow-sm mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 text-gray-500">
            <CalendarDays className="w-5 h-5" />
            <span className="text-xs uppercase tracking-widest">Monthly Calendar</span>
          </div>
          <select
            value={calMonth}
            onChange={e => setCalMonth(Number(e.target.value))}
            className="text-xs uppercase tracking-widest bg-transparent border border-muted-gold/20 rounded px-2 py-1 text-charcoal outline-none cursor-pointer"
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={i} value={i + 1}>{name}</option>
            ))}
          </select>
        </div>

        {/* Week headers */}
        <div className="grid grid-cols-7 mb-2">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="text-center text-[10px] uppercase tracking-widest text-gray-300 py-1">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayEntries = calendarData.get(day);
            const hasEntries = !!dayEntries && dayEntries.length > 0;
            const colors = hasEntries
              ? [...new Set(dayEntries.map(e => e.colorTag).filter(Boolean) as ColorTag[])]
              : [];

            return (
              <div
                key={day}
                className={`rounded-md p-1 flex flex-col items-center min-h-[52px] transition-colors ${
                  hasEntries ? 'bg-muted-gold/10' : 'bg-transparent'
                }`}
              >
                <span className={`text-[11px] font-serif w-full text-center ${hasEntries ? 'text-charcoal font-bold' : 'text-gray-300'}`}>
                  {day}
                </span>
                {hasEntries && (
                  <>
                    <span className="text-[10px] text-gray-400 font-serif leading-none mt-0.5">
                      ×{dayEntries!.length}
                    </span>
                    <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                      {colors.length > 0
                        ? colors.map(c => (
                            <div key={c} className={`w-2 h-2 rounded-full ${COLOR_DOT[c]}`} />
                          ))
                        : <div className="w-2 h-2 rounded-full bg-muted-gold/40" />
                      }
                    </div>
                  </>
                )}
              </div>
            );
          })}
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