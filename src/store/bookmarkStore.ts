import { create } from 'zustand';
import type { Bookmark } from '../types';
import { bookmarkDB } from '../db';
import { generateId } from '../utils/fileParser';

interface BookmarkStore {
  bookmarks: Bookmark[];
  loading: boolean;
  error: string | null;
  loadBookmarks: () => Promise<void>;
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateBookmark: (bookmark: Bookmark) => Promise<void>;
  deleteBookmark: (id: string) => Promise<void>;
  getBookmarksByBook: (bookId: string) => Bookmark[];
}

export const useBookmarkStore = create<BookmarkStore>((set, get) => ({
  bookmarks: [],
  loading: false,
  error: null,

  loadBookmarks: async () => {
    set({ loading: true, error: null });
    try {
      const bookmarks = await bookmarkDB.getAll();
      bookmarks.sort((a, b) => b.createdAt - a.createdAt);
      set({ bookmarks, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  addBookmark: async (data) => {
    const now = Date.now();
    const bookmark: Bookmark = {
      ...data,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    try {
      await bookmarkDB.add(bookmark);
      set((state) => ({ bookmarks: [bookmark, ...state.bookmarks] }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  updateBookmark: async (bookmark) => {
    bookmark.updatedAt = Date.now();
    try {
      await bookmarkDB.update(bookmark);
      set((state) => ({
        bookmarks: state.bookmarks.map((b) => (b.id === bookmark.id ? bookmark : b)),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  deleteBookmark: async (id) => {
    try {
      await bookmarkDB.delete(id);
      set((state) => ({
        bookmarks: state.bookmarks.filter((b) => b.id !== id),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  getBookmarksByBook: (bookId) => {
    return get().bookmarks.filter((b) => b.bookId === bookId);
  },
}));
