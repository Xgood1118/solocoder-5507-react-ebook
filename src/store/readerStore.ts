import { create } from 'zustand';
import type { Book, ReadingProgress } from '../types';
import { useBookStore } from './bookStore';

interface ReaderState {
  currentBook: Book | null;
  currentChapter: number;
  charOffset: number;
  totalReadingTime: number;
  sessionStartTime: number;
  toolbarVisible: boolean;
  showBookmarkModal: boolean;
  bookmarkNote: string;
  pendingProgress: ReadingProgress | null;
  setCurrentBook: (book: Book | null) => void;
  setCurrentChapter: (chapter: number) => void;
  setCharOffset: (offset: number) => void;
  nextChapter: () => void;
  prevChapter: () => void;
  goToChapter: (index: number) => void;
  toggleToolbar: (visible?: boolean) => void;
  showAddBookmark: () => void;
  hideAddBookmark: () => void;
  setBookmarkNote: (note: string) => void;
  saveProgress: () => Promise<void>;
  loadProgress: (bookId: string) => void;
  startSession: () => void;
  endSession: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const debounce = <T extends (...args: any[]) => void>(fn: T, delay: number) => {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

const saveProgressToStorage = (bookId: string, progress: ReadingProgress) => {
  try {
    const key = `progress_${bookId}`;
    localStorage.setItem(key, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save progress:', e);
  }
};

const debouncedSave = debounce(saveProgressToStorage, 1000);

export const useReaderStore = create<ReaderState>((set, get) => ({
  currentBook: null,
  currentChapter: 0,
  charOffset: 0,
  totalReadingTime: 0,
  sessionStartTime: 0,
  toolbarVisible: true,
  showBookmarkModal: false,
  bookmarkNote: '',
  pendingProgress: null,

  setCurrentBook: (book) => {
    if (book) {
      get().loadProgress(book.id);
    }
    set({ currentBook: book });
  },

  setCurrentChapter: (chapter) => {
    const { currentBook } = get();
    if (!currentBook || chapter < 0 || chapter >= currentBook.chapters.length) return;
    set({ currentChapter: chapter, charOffset: 0 });
    get().saveProgress();
  },

  setCharOffset: (offset) => {
    set({ charOffset: offset });
    get().saveProgress();
  },

  nextChapter: () => {
    const { currentBook, currentChapter } = get();
    if (currentBook && currentChapter < currentBook.chapters.length - 1) {
      get().setCurrentChapter(currentChapter + 1);
    }
  },

  prevChapter: () => {
    const { currentChapter } = get();
    if (currentChapter > 0) {
      get().setCurrentChapter(currentChapter - 1);
    }
  },

  goToChapter: (index) => {
    get().setCurrentChapter(index);
  },

  toggleToolbar: (visible) => {
    if (typeof visible === 'boolean') {
      set({ toolbarVisible: visible });
    } else {
      set((state) => ({ toolbarVisible: !state.toolbarVisible }));
    }
  },

  showAddBookmark: () => set({ showBookmarkModal: true, bookmarkNote: '' }),
  hideAddBookmark: () => set({ showBookmarkModal: false }),
  setBookmarkNote: (note) => set({ bookmarkNote: note }),

  saveProgress: async () => {
    const { currentBook, currentChapter, charOffset, totalReadingTime } = get();
    if (!currentBook) return;

    const progress: ReadingProgress = {
      bookId: currentBook.id,
      lastChapter: currentChapter,
      charOffset,
      totalReadingTime,
      lastReadTime: Date.now(),
    };

    set({ pendingProgress: progress });

    debouncedSave(currentBook.id, progress);

    const readingProgress = Math.min(
      1,
      (currentChapter + (charOffset / Math.max(currentBook.chapters[currentChapter]?.content.length || 1, 1))) / currentBook.totalChapters
    );

    const updatedBook = {
      ...currentBook,
      readingProgress,
      lastReadTime: Date.now(),
      lastChapterIndex: currentChapter,
      lastChapterTitle: currentBook.chapters[currentChapter]?.title || '',
    };

    await useBookStore.getState().updateBook(updatedBook);
  },

  loadProgress: (bookId: string) => {
    try {
      const key = `progress_${bookId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const progress: ReadingProgress = JSON.parse(stored);
        set({
          currentChapter: progress.lastChapter,
          charOffset: progress.charOffset,
          totalReadingTime: progress.totalReadingTime,
        });
      } else {
        set({ currentChapter: 0, charOffset: 0, totalReadingTime: 0 });
      }
    } catch (e) {
      console.error('Failed to load progress:', e);
    }
  },

  startSession: () => {
    set({ sessionStartTime: Date.now() });
  },

  endSession: () => {
    const { sessionStartTime, totalReadingTime } = get();
    if (sessionStartTime > 0) {
      const sessionDuration = Date.now() - sessionStartTime;
      const newTotal = totalReadingTime + sessionDuration;
      set({ totalReadingTime: newTotal, sessionStartTime: 0 });
      get().saveProgress();
    }
  },
}));
