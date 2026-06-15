import { create } from 'zustand';
import type { Book, ImportResult, BookType, Chapter } from '../types';
import { bookDB } from '../db';
import {
  detectFileType,
  readFileAsText,
  readFileAsArrayBuffer,
  fetchUrlAsText,
  fetchUrlAsArrayBuffer,
  parseTxtChapters,
  parseEpub,
  generateSummary,
  generateId,
  generateDefaultCover,
} from '../utils/fileParser';
import { computeTextPHash, isDuplicate } from '../utils/phash';

interface BookStore {
  books: Book[];
  loading: boolean;
  error: string | null;
  importResult: ImportResult | null;
  loadBooks: () => Promise<void>;
  addBook: (book: Book) => Promise<void>;
  updateBook: (book: Book) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
  importFromFile: (file: File) => Promise<ImportResult>;
  importFromUrl: (url: string) => Promise<ImportResult>;
  checkDuplicate: (phash: string) => Promise<Book | undefined>;
  clearImportResult: () => void;
  setError: (error: string | null) => void;
}

export const useBookStore = create<BookStore>((set, get) => ({
  books: [],
  loading: false,
  error: null,
  importResult: null,

  loadBooks: async () => {
    set({ loading: true, error: null });
    try {
      const books = await bookDB.getAll();
      books.sort((a, b) => b.lastReadTime - a.lastReadTime);
      set({ books, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  addBook: async (book: Book) => {
    try {
      await bookDB.add(book);
      set((state) => ({ books: [book, ...state.books] }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  updateBook: async (book: Book) => {
    try {
      book.updatedAt = Date.now();
      await bookDB.update(book);
      set((state) => ({
        books: state.books.map((b) => (b.id === book.id ? book : b)),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  deleteBook: async (id: string) => {
    try {
      await bookDB.delete(id);
      set((state) => ({
        books: state.books.filter((b) => b.id !== id),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  importFromFile: async (file: File): Promise<ImportResult> => {
    set({ loading: true, error: null });
    try {
      const result = await processImport(file.name, file);
      if (result.success && result.book && !result.duplicate) {
        set((state) => ({ books: [result.book!, ...state.books] }));
      }
      set({ loading: false, importResult: result });
      return result;
    } catch (error) {
      const errMsg = (error as Error).message;
      set({ error: errMsg, loading: false });
      return { success: false, error: errMsg };
    }
  },

  importFromUrl: async (url: string): Promise<ImportResult> => {
    set({ loading: true, error: null });
    try {
      const fileName = url.split('/').pop() || url;
      const result = await processImport(fileName, null, url);
      if (result.success && result.book && !result.duplicate) {
        set((state) => ({ books: [result.book!, ...state.books] }));
      }
      set({ loading: false, importResult: result });
      return result;
    } catch (error) {
      const errMsg = (error as Error).message;
      set({ error: errMsg, loading: false });
      return { success: false, error: errMsg };
    }
  },

  checkDuplicate: async (phash: string): Promise<Book | undefined> => {
    const existingBooks = get().books;
    for (const book of existingBooks) {
      if (isDuplicate(book.phash, phash)) {
        return book;
      }
    }
    return undefined;
  },

  clearImportResult: () => set({ importResult: null }),
  setError: (error) => set({ error }),
}));

async function processImport(
  fileName: string,
  file: File | null,
  url?: string
): Promise<ImportResult> {
  const fileType = detectFileType(fileName);

  if (fileType === 'pdf') {
    return {
      success: false,
      error: 'PDF 文件暂不支持，请使用 TXT 或 EPUB 格式。',
    };
  }

  if (fileType === 'unknown') {
    return {
      success: false,
      error: '不支持的文件格式，请使用 TXT 或 EPUB 格式。',
    };
  }

  let title = '';
  let author = '';
  let chapters: Chapter[] = [];
  let coverImage: string | undefined;
  let fullText = '';

  if (fileType === 'txt') {
    const text = file ? await readFileAsText(file) : await fetchUrlAsText(url!);
    fullText = text;
    chapters = parseTxtChapters(text);
    title = fileName.replace(/\.[^/.]+$/, '');
    author = '未知作者';
  } else if (fileType === 'epub') {
    const buffer = file ? await readFileAsArrayBuffer(file) : await fetchUrlAsArrayBuffer(url!);
    const epubData = await parseEpub(buffer);
    chapters = epubData.chapters;
    title = epubData.title;
    author = epubData.author;
    coverImage = epubData.coverImage;
    fullText = chapters.map((c) => c.content).join('\n');
  }

  const phash = await computeTextPHash(fullText);
  const existingBook = await bookDB.getByPhash(phash);
  const summary = generateSummary(chapters);
  const now = Date.now();

  const newBook: Book = {
    id: generateId(),
    title,
    author,
    filePath: url || fileName,
    type: fileType as BookType,
    totalChapters: chapters.length,
    readingProgress: 0,
    lastReadTime: now,
    coverImage: coverImage || generateDefaultCover(title, author),
    summary,
    phash,
    lastChapterIndex: 0,
    lastChapterTitle: chapters[0]?.title || '',
    chapters,
    createdAt: now,
    updatedAt: now,
  };

  if (existingBook) {
    return {
      success: true,
      duplicate: true,
      existingBook,
      book: newBook,
    };
  }

  await bookDB.add(newBook);

  return {
    success: true,
    book: newBook,
  };
}
