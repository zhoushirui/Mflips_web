import { DiaryEntry, ColorTag } from '../types';

const STORAGE_KEY = 'mflip_diary_data';

// Helper to format date as YYYY.MM.DD HH:MM:SS
const formatDate = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

export const saveEntry = (content: string, colorTag?: ColorTag): DiaryEntry => {
  const now = new Date();
  const entry: DiaryEntry = {
    id: crypto.randomUUID(),
    timestamp: now.getTime(),
    content: content,
    formattedDate: formatDate(now),
    colorTag: colorTag,
  };

  const allData = getAllData();
  allData.push(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
  return entry;
};

// Update an existing entry
export const updateEntry = (id: string, newContent: string): void => {
  const allData = getAllData();
  const index = allData.findIndex(d => d.id === id);
  if (index !== -1) {
    allData[index].content = newContent;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
  }
};

// Delete an entry by id
export const deleteEntry = (id: string): void => {
  const allData = getAllData();
  const filtered = allData.filter(d => d.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export const getAllData = (): DiaryEntry[] => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to parse diary data", e);
    return [];
  }
};

export const getYears = (): number[] => {
  const data = getAllData();
  const years = new Set(data.map(d => new Date(d.timestamp).getFullYear()));
  return Array.from(years).sort((a, b) => b - a);
};

export const getMonthsForYear = (year: number): number[] => {
  const data = getAllData();
  const months = new Set(
    data
      .filter(d => new Date(d.timestamp).getFullYear() === year)
      .map(d => new Date(d.timestamp).getMonth() + 1)
  );
  return Array.from(months).sort((a, b) => a - b);
};

export const getEntriesForMonth = (year: number, month: number): DiaryEntry[] => {
  const data = getAllData();
  return data
    .filter(d => {
      const date = new Date(d.timestamp);
      return date.getFullYear() === year && (date.getMonth() + 1) === month;
    })
    .sort((a, b) => b.timestamp - a.timestamp);
};

export const getEntriesForYear = (year: number): DiaryEntry[] => {
  const data = getAllData();
  return data
    .filter(d => new Date(d.timestamp).getFullYear() === year)
    .sort((a, b) => a.timestamp - b.timestamp);
};

// Global full-text search across all entries
export const searchEntries = (query: string): DiaryEntry[] => {
  if (!query.trim()) return [];
  const data = getAllData();
  const lower = query.toLowerCase();
  return data
    .filter(d => d.content.toLowerCase().includes(lower))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 60);
};

// Convert markdown to HTML for .doc export display
const markdownToHtml = (text: string): string =>
  text
    .replace(/\*\*([^*]+?)\*\*/g, '<b>$1</b>')
    .replace(/\*([^*]+?)\*/g, '<i>$1</i>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    .replace(/`([^`]+?)`/g, '<code>$1</code>')
    .replace(/<u>(.+?)<\/u>/g, '<u>$1</u>');

const escapeAttr = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Export to .doc — preserves color tags and raw markdown via data attributes
export const exportMonthToDoc = (year: number, month: number) => {
  const entries = getEntriesForMonth(year, month);
  if (entries.length === 0) return;

  let docContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Diary Export</title>
    <style>
      body { font-family: 'Songti SC', 'SimSun', serif; }
      .entry { margin-bottom: 32px; }
      .meta { font-weight: bold; color: #666; font-size: 10pt; margin-bottom: 8px; }
      .content { font-size: 12pt; white-space: pre-wrap; line-height: 1.6; }
      .color-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-left: 6px; vertical-align: middle; }
      .red { background: #E57373; } .yellow { background: #F0D588; } .green { background: #81C784; }
    </style>
    </head><body>
    <h1>Mflip Diary - ${year} / ${month}</h1><br/>
  `;

  entries.forEach(entry => {
    const colorAttr = entry.colorTag ? ` data-color="${entry.colorTag}"` : '';
    const rawAttr = ` data-raw="${escapeAttr(entry.content)}"`;
    const colorDot = entry.colorTag
      ? `<span class="color-dot ${entry.colorTag}"></span>`
      : '';
    docContent += `
      <div class="entry"${colorAttr}${rawAttr}>
        <div class="meta">${entry.formattedDate}${colorDot}</div>
        <div class="content">${markdownToHtml(entry.content)}</div>
      </div>
    `;
  });

  docContent += "</body></html>";

  const blob = new Blob(['\ufeff', docContent], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Mflip_${year}_${month}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Import from .doc — restores color tags and raw markdown content
export const importFromDoc = async (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return resolve(0);

      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const entryDivs = doc.querySelectorAll('.entry');

        const existingData = getAllData();
        const newEntries: DiaryEntry[] = [];

        entryDivs.forEach(div => {
          const el = div as HTMLElement;
          // Strip color dot text from meta
          const metaEl = div.querySelector('.meta');
          const metaDots = metaEl?.querySelectorAll('.color-dot');
          metaDots?.forEach(d => d.remove());
          const meta = metaEl?.textContent?.trim();

          // Prefer data-raw (lossless); fall back to rendered textContent
          const rawContent = el.dataset.raw;
          const content = rawContent || div.querySelector('.content')?.textContent;
          const colorTag = (el.dataset.color as ColorTag) || undefined;

          if (meta && content) {
            const timeStr = meta.replace(/\./g, '-');
            const timestamp = Date.parse(timeStr);

            if (!isNaN(timestamp)) {
              const isDup = existingData.some(ed =>
                ed.timestamp === timestamp ||
                (Math.abs(ed.timestamp - timestamp) < 5000 && ed.content === content.trim())
              );

              if (!isDup) {
                newEntries.push({
                  id: crypto.randomUUID(),
                  timestamp,
                  content: content.trim(),
                  formattedDate: meta,
                  colorTag,
                });
              }
            }
          }
        });

        if (newEntries.length > 0) {
          const mergedData = [...existingData, ...newEntries].sort((a, b) => a.timestamp - b.timestamp);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedData));
        }

        resolve(newEntries.length);
      } catch (err) {
        console.error("Import Parsing Error", err);
        resolve(0);
      }
    };
    reader.readAsText(file);
  });
};
