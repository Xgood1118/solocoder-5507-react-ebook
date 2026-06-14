import { create } from 'zustand';
import type { SearchResult, SearchIndexEntry } from '../types';
import { searchIndexDB } from '../db';
import { useBookStore } from './bookStore';

interface SearchStore {
  results: SearchResult[];
  indexing: boolean;
  searching: boolean;
  indexProgress: number;
  error: string | null;
  searchQuery: string;
  buildIndexForBook: (bookId: string) => Promise<void>;
  buildAllIndexes: () => Promise<void>;
  search: (query: string) => Promise<void>;
  clearResults: () => void;
  setSearchQuery: (query: string) => void;
}

const tokenize = (text: string): string[] => {
  const cleaned = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5\s]/g, ' ');
  const tokens: string[] = [];

  const words = cleaned.split(/\s+/).filter((w) => w.length > 0);
  words.forEach((word) => {
    if (/^[\u4e00-\u9fa5]+$/.test(word)) {
      for (let i = 0; i < word.length - 1; i++) {
        tokens.push(word.substring(i, i + 2));
      }
    } else if (word.length >= 2) {
      tokens.push(word);
    }
  });

  return [...new Set(tokens)];
};

export const useSearchStore = create<SearchStore>((set) => ({
  results: [],
  indexing: false,
  searching: false,
  indexProgress: 0,
  error: null,
  searchQuery: '',

  buildIndexForBook: async (bookId: string) => {
    const { books } = useBookStore.getState();
    const book = books.find((b) => b.id === bookId);
    if (!book) return;

    const existingMeta = await searchIndexDB.getMetadata(bookId);
    if (existingMeta && existingMeta.lastIndexedAt >= book.updatedAt) {
      return;
    }

    set({ indexing: true, indexProgress: 0 });

    try {
      await searchIndexDB.deleteByBookId(bookId);

      const entries: SearchIndexEntry[] = [];
      let wordCount = 0;

      for (let i = 0; i < book.chapters.length; i++) {
        const chapter = book.chapters[i];
        const tokens = tokenize(chapter.content);
        const titleTokens = tokenize(chapter.title);
        const allTokens = [...new Set([...tokens, ...titleTokens])];

        allTokens.forEach((token) => {
          const positions: number[] = [];
          const lowerContent = chapter.content.toLowerCase();
          const lowerTitle = chapter.title.toLowerCase();

          let pos = lowerContent.indexOf(token);
          while (pos !== -1) {
            positions.push(pos);
            pos = lowerContent.indexOf(token, pos + 1);
          }

          pos = lowerTitle.indexOf(token);
          while (pos !== -1) {
            if (!positions.includes(pos)) {
              positions.push(pos);
            }
            pos = lowerTitle.indexOf(token, pos + 1);
          }

          if (positions.length > 0) {
            entries.push({
              bookId,
              chapterIndex: i,
              word: token,
              positions,
            });
            wordCount += positions.length;
          }
        });

        set({ indexProgress: ((i + 1) / book.chapters.length) * 100 });
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      await searchIndexDB.addEntries(entries);
      await searchIndexDB.setMetadata({
        bookId,
        lastIndexedAt: Date.now(),
        wordCount,
      });

      set({ indexing: false, indexProgress: 100 });
    } catch (error) {
      set({ error: (error as Error).message, indexing: false });
    }
  },

  buildAllIndexes: async () => {
    const { books } = useBookStore.getState();
    set({ indexing: true, indexProgress: 0 });

    for (let i = 0; i < books.length; i++) {
      await getState().buildIndexForBook(books[i].id);
      set({ indexProgress: ((i + 1) / books.length) * 100 });
    }

    set({ indexing: false, indexProgress: 100 });
  },

  search: async (query: string) => {
    if (!query.trim()) {
      set({ results: [], searchQuery: '' });
      return;
    }

    set({ searching: true, error: null, searchQuery: query });

    try {
      const { books } = useBookStore.getState();
      const queryTokens = tokenize(query);

      if (queryTokens.length === 0) {
        set({ results: [], searching: false });
        return;
      }

      const allMatches = new Map<string, { positions: number[]; chapterIndex: number; bookId: string }>();

      for (const token of queryTokens) {
        const entries = await searchIndexDB.searchByWord(token);
        entries.forEach((entry) => {
          const key = `${entry.bookId}-${entry.chapterIndex}`;
          if (!allMatches.has(key)) {
            allMatches.set(key, {
              positions: [],
              chapterIndex: entry.chapterIndex,
              bookId: entry.bookId,
            });
          }
          allMatches.get(key)!.positions.push(...entry.positions);
        });
      }

      const results: SearchResult[] = [];

      allMatches.forEach((match) => {
        const book = books.find((b) => b.id === match.bookId);
        if (!book) return;

        const chapter = book.chapters[match.chapterIndex];
        if (!chapter) return;

        const sortedPositions = [...new Set(match.positions)].sort((a, b) => a - b);

        sortedPositions.forEach((pos) => {
          const contextStart = Math.max(0, pos - 20);
          const contextEnd = Math.min(chapter.content.length, pos + query.length + 20);
          const context = chapter.content.substring(contextStart, contextEnd);

          const highlightStart = pos - contextStart;
          const highlightEnd = highlightStart + query.length;

          results.push({
            bookId: book.id,
            bookTitle: book.title,
            chapterIndex: match.chapterIndex,
            chapterTitle: chapter.title,
            charOffset: pos,
            context,
            highlightStart,
            highlightEnd,
          });
        });
      });

      results.sort((a, b) => {
        const aInTitle = a.chapterTitle.toLowerCase().includes(query.toLowerCase());
        const bInTitle = b.chapterTitle.toLowerCase().includes(query.toLowerCase());
        if (aInTitle && !bInTitle) return -1;
        if (!aInTitle && bInTitle) return 1;
        return 0;
      });

      set({ results, searching: false });
    } catch (error) {
      set({ error: (error as Error).message, searching: false });
    }
  },

  clearResults: () => set({ results: [], searchQuery: '' }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));

function getState() {
  return useSearchStore.getState();
}
