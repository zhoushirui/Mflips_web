export type ColorTag = 'red' | 'yellow' | 'green';

export interface DiaryEntry {
  id: string;
  timestamp: number; // Unix timestamp
  content: string;
  formattedDate: string; // YYYY.MM.DD HH:MM:SS
  colorTag?: ColorTag;
}

export interface MonthData {
  month: number; // 1-12
  entries: DiaryEntry[];
}

export interface YearData {
  year: number;
  months: { [key: number]: DiaryEntry[] }; // key is month index 1-12
}

export enum ViewMode {
  BOOKSHELF = 'BOOKSHELF',
  STREAM = 'STREAM',
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];