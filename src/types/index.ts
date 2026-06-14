export type BookType = 'txt' | 'epub';

export interface Book {
  id: string;
  title: string;
  author: string;
  filePath: string;
  type: BookType;
  totalChapters: number;
  readingProgress: number;
  lastReadTime: number;
  coverImage: string;
  summary: string;
  phash: string;
  lastChapterIndex: number;
  lastChapterTitle: string;
  chapters: Chapter[];
  createdAt: number;
  updatedAt: number;
}

export interface Chapter {
  index: number;
  title: string;
  content: string;
  wordCount: number;
}

export interface Bookmark {
  id: string;
  bookId: string;
  chapterIndex: number;
  charOffset: number;
  note: string;
  createdAt: number;
  updatedAt: number;
}

export interface ReadingProgress {
  bookId: string;
  lastChapter: number;
  charOffset: number;
  totalReadingTime: number;
  lastReadTime: number;
}

export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';
export type LineHeight = 'compact' | 'normal' | 'loose';
export type ThemeVariant = 'light1' | 'light2' | 'light3' | 'dark1' | 'dark2' | 'dark3';

export interface ReaderPreferences {
  fontSize: FontSize;
  lineHeight: LineHeight;
  theme: ThemeVariant;
}

export interface SearchResult {
  bookId: string;
  bookTitle: string;
  chapterIndex: number;
  chapterTitle: string;
  charOffset: number;
  context: string;
  highlightStart: number;
  highlightEnd: number;
}

export interface SearchIndexEntry {
  bookId: string;
  chapterIndex: number;
  word: string;
  positions: number[];
}

export interface SearchIndexMetadata {
  bookId: string;
  lastIndexedAt: number;
  wordCount: number;
}

export type ImportSource = 'local' | 'url';

export interface ImportResult {
  success: boolean;
  book?: Book;
  error?: string;
  duplicate?: boolean;
  existingBook?: Book;
}

export const FONT_SIZE_MAP: Record<FontSize, string> = {
  small: '14px',
  medium: '16px',
  large: '18px',
  xlarge: '20px',
};

export const LINE_HEIGHT_MAP: Record<LineHeight, number> = {
  compact: 1.4,
  normal: 1.6,
  loose: 1.8,
};

export const THEME_MAP: Record<ThemeVariant, { bg: string; text: string; accent: string }> = {
  light1: { bg: '#ffffff', text: '#1a1a1a', accent: '#3b82f6' },
  light2: { bg: '#fef3c7', text: '#78350f', accent: '#d97706' },
  light3: { bg: '#f0fdf4', text: '#14532d', accent: '#16a34a' },
  dark1: { bg: '#1a1a2e', text: '#e0e0e0', accent: '#60a5fa' },
  dark2: { bg: '#1e1e2e', text: '#cdd6f4', accent: '#89b4fa' },
  dark3: { bg: '#0f172a', text: '#cbd5e1', accent: '#38bdf8' },
};
