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
  return Array.from(years).sort((a, b) => b - a); // Descending
};

export const getMonthsForYear = (year: number): number[] => {
  const data = getAllData();
  const months = new Set(
    data
      .filter(d => new Date(d.timestamp).getFullYear() === year)
      .map(d => new Date(d.timestamp).getMonth() + 1)
  );
  return Array.from(months).sort((a, b) => a - b); // Ascending Jan -> Dec
};

export const getEntriesForMonth = (year: number, month: number): DiaryEntry[] => {
  const data = getAllData();
  return data
    .filter(d => {
      const date = new Date(d.timestamp);
      // Month in JS Date is 0-11, our input is 1-12
      return date.getFullYear() === year && (date.getMonth() + 1) === month;
    })
    .sort((a, b) => b.timestamp - a.timestamp); // Newest first
};

export const getEntriesForYear = (year: number): DiaryEntry[] => {
  const data = getAllData();
  return data
    .filter(d => new Date(d.timestamp).getFullYear() === year)
    .sort((a, b) => a.timestamp - b.timestamp); // Oldest first for stats usually, but doesn't matter much
};

// Export to Docx (Simulated HTML)
export const exportMonthToDoc = (year: number, month: number) => {
  const entries = getEntriesForMonth(year, month);
  if (entries.length === 0) return;

  let docContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Diary Export</title>
    <style>
      body { font-family: 'Songti SC', 'SimSun', serif; }
      .entry { margin-bottom: 32px; } /* Increased margin, removed border */
      .meta { font-weight: bold; color: #666; font-size: 10pt; margin-bottom: 8px; }
      .content { font-size: 12pt; white-space: pre-wrap; line-height: 1.6; }
    </style>
    </head><body>
    <h1>Mflip Diary - ${year} / ${month}</h1>
    <br/>
  `;

  entries.forEach(entry => {
    // Simple logic to strip markdown for doc export
    const cleanContent = entry.content.replace(/\*\*(.*?)\*\*/g, '$1').replace(/<u>(.*?)<\/u>/g, '$1');
    docContent += `
      <div class="entry">
        <div class="meta">${entry.formattedDate}</div>
        <div class="content">${cleanContent}</div>
      </div>
    `;
  });

  docContent += "</body></html>";

  const blob = new Blob(['\ufeff', docContent], {
    type: 'application/msword'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Mflip_${year}_${month}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Import from Doc (Restore Backup)
export const importFromDoc = async (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return resolve(0);

      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        // Our export format uses div.entry, div.meta, div.content
        const entryDivs = doc.querySelectorAll('.entry');
        
        const existingData = getAllData();
        const newEntries: DiaryEntry[] = [];
        
        entryDivs.forEach(div => {
            const meta = div.querySelector('.meta')?.textContent;
            // use textContent to get plain text (stripping html tags if any)
            const content = div.querySelector('.content')?.textContent; 

            if (meta && content) {
                // Parse date: YYYY.MM.DD HH:MM:SS
                // Replace dots with dashes for better JS date parsing support
                const timeStr = meta.replace(/\./g, '-');
                const timestamp = Date.parse(timeStr);

                if (!isNaN(timestamp)) {
                    // Duplicate Check: Same timestamp OR (Similar time AND Same content)
                    const isDup = existingData.some(ed => 
                        ed.timestamp === timestamp || 
                        (Math.abs(ed.timestamp - timestamp) < 5000 && ed.content === content)
                    );

                    if (!isDup) {
                        newEntries.push({
                            id: crypto.randomUUID(),
                            timestamp: timestamp,
                            content: content.trim(), // Import as plain text
                            formattedDate: meta.trim(),
                            // colorTag is lost in doc format, that's expected
                        });
                    }
                }
            }
        });

        if (newEntries.length > 0) {
            const mergedData = [...existingData, ...newEntries];
            // Sort by time
            mergedData.sort((a, b) => a.timestamp - b.timestamp);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedData));
        }

        resolve(newEntries.length);

      } catch (err) {
        console.error("Import Parsing Error", err);
        resolve(0); // Fail gracefully
      }
    };
    // .doc is actually HTML in our case, so read as text
    reader.readAsText(file);
  });
};