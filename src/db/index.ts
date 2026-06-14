import type { Book, Bookmark, SearchIndexEntry, SearchIndexMetadata } from '../types';

const DB_NAME = 'ebook-reader-db';
const DB_VERSION = 1;

const STORE_BOOKS = 'books';
const STORE_BOOKMARKS = 'bookmarks';
const STORE_SEARCH_INDEX = 'searchIndex';
const STORE_SEARCH_METADATA = 'searchMetadata';

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_BOOKS)) {
        const bookStore = db.createObjectStore(STORE_BOOKS, { keyPath: 'id' });
        bookStore.createIndex('phash', 'phash', { unique: false });
        bookStore.createIndex('lastReadTime', 'lastReadTime', { unique: false });
        bookStore.createIndex('title', 'title', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_BOOKMARKS)) {
        const bookmarkStore = db.createObjectStore(STORE_BOOKMARKS, { keyPath: 'id' });
        bookmarkStore.createIndex('bookId', 'bookId', { unique: false });
        bookmarkStore.createIndex('bookId-chapter', ['bookId', 'chapterIndex'], { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_SEARCH_INDEX)) {
        const searchStore = db.createObjectStore(STORE_SEARCH_INDEX, { keyPath: ['bookId', 'chapterIndex', 'word'] });
        searchStore.createIndex('word', 'word', { unique: false });
        searchStore.createIndex('bookId', 'bookId', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_SEARCH_METADATA)) {
        db.createObjectStore(STORE_SEARCH_METADATA, { keyPath: 'bookId' });
      }
    };
  });
}

async function withTransaction<T>(
  storeNames: string[],
  mode: IDBTransactionMode,
  callback: (stores: Record<string, IDBObjectStore>) => Promise<T> | T
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeNames, mode);
    const stores: Record<string, IDBObjectStore> = {};

    storeNames.forEach((name) => {
      stores[name] = transaction.objectStore(name);
    });

    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => resolve(result as T);

    let result: T;
    Promise.resolve(callback(stores)).then((r) => {
      result = r;
      if (mode === 'readonly') {
        transaction.commit();
      }
    }).catch(reject);
  });
}

export const bookDB = {
  async getAll(): Promise<Book[]> {
    return withTransaction([STORE_BOOKS], 'readonly', (stores) => {
      return new Promise<Book[]>((resolve, reject) => {
        const request = stores[STORE_BOOKS].getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  },

  async getById(id: string): Promise<Book | undefined> {
    return withTransaction([STORE_BOOKS], 'readonly', (stores) => {
      return new Promise<Book | undefined>((resolve, reject) => {
        const request = stores[STORE_BOOKS].get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  },

  async getByPhash(phash: string): Promise<Book | undefined> {
    return withTransaction([STORE_BOOKS], 'readonly', (stores) => {
      return new Promise<Book | undefined>((resolve, reject) => {
        const index = stores[STORE_BOOKS].index('phash');
        const request = index.get(phash);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  },

  async add(book: Book): Promise<void> {
    return withTransaction([STORE_BOOKS], 'readwrite', (stores) => {
      return new Promise<void>((resolve, reject) => {
        const request = stores[STORE_BOOKS].add(book);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  },

  async update(book: Book): Promise<void> {
    return withTransaction([STORE_BOOKS], 'readwrite', (stores) => {
      return new Promise<void>((resolve, reject) => {
        const request = stores[STORE_BOOKS].put(book);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  },

  async delete(id: string): Promise<void> {
    return withTransaction([STORE_BOOKS, STORE_BOOKMARKS, STORE_SEARCH_INDEX, STORE_SEARCH_METADATA], 'readwrite', (stores) => {
      return new Promise<void>((resolve, reject) => {
        const bookRequest = stores[STORE_BOOKS].delete(id);
        bookRequest.onsuccess = () => {
          const bookmarkIndex = stores[STORE_BOOKMARKS].index('bookId');
          const bookmarkRequest = bookmarkIndex.openCursor(IDBKeyRange.only(id));
          bookmarkRequest.onsuccess = () => {
            const cursor = bookmarkRequest.result;
            if (cursor) {
              cursor.delete();
              cursor.continue();
            }
          };

          const searchIndex = stores[STORE_SEARCH_INDEX].index('bookId');
          const searchRequest = searchIndex.openCursor(IDBKeyRange.only(id));
          searchRequest.onsuccess = () => {
            const cursor = searchRequest.result;
            if (cursor) {
              cursor.delete();
              cursor.continue();
            }
          };

          stores[STORE_SEARCH_METADATA].delete(id);
          resolve();
        };
        bookRequest.onerror = () => reject(bookRequest.error);
      });
    });
  },
};

export const bookmarkDB = {
  async getAll(): Promise<Bookmark[]> {
    return withTransaction([STORE_BOOKMARKS], 'readonly', (stores) => {
      return new Promise<Bookmark[]>((resolve, reject) => {
        const request = stores[STORE_BOOKMARKS].getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  },

  async getByBookId(bookId: string): Promise<Bookmark[]> {
    return withTransaction([STORE_BOOKMARKS], 'readonly', (stores) => {
      return new Promise<Bookmark[]>((resolve, reject) => {
        const index = stores[STORE_BOOKMARKS].index('bookId');
        const request = index.getAll(IDBKeyRange.only(bookId));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  },

  async add(bookmark: Bookmark): Promise<void> {
    return withTransaction([STORE_BOOKMARKS], 'readwrite', (stores) => {
      return new Promise<void>((resolve, reject) => {
        const request = stores[STORE_BOOKMARKS].add(bookmark);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  },

  async update(bookmark: Bookmark): Promise<void> {
    return withTransaction([STORE_BOOKMARKS], 'readwrite', (stores) => {
      return new Promise<void>((resolve, reject) => {
        const request = stores[STORE_BOOKMARKS].put(bookmark);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  },

  async delete(id: string): Promise<void> {
    return withTransaction([STORE_BOOKMARKS], 'readwrite', (stores) => {
      return new Promise<void>((resolve, reject) => {
        const request = stores[STORE_BOOKMARKS].delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  },
};

export const searchIndexDB = {
  async addEntries(entries: SearchIndexEntry[]): Promise<void> {
    return withTransaction([STORE_SEARCH_INDEX], 'readwrite', (stores) => {
      return Promise.all(
        entries.map(
          (entry) =>
            new Promise<void>((resolve, reject) => {
              const request = stores[STORE_SEARCH_INDEX].put(entry);
              request.onsuccess = () => resolve();
              request.onerror = () => reject(request.error);
            })
        )
      ).then(() => {});
    });
  },

  async searchByWord(word: string): Promise<SearchIndexEntry[]> {
    return withTransaction([STORE_SEARCH_INDEX], 'readonly', (stores) => {
      return new Promise<SearchIndexEntry[]>((resolve, reject) => {
        const index = stores[STORE_SEARCH_INDEX].index('word');
        const range = IDBKeyRange.bound(word.toLowerCase(), word.toLowerCase() + '\uffff', false, false);
        const request = index.getAll(range);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  },

  async deleteByBookId(bookId: string): Promise<void> {
    return withTransaction([STORE_SEARCH_INDEX], 'readwrite', (stores) => {
      return new Promise<void>((resolve, reject) => {
        const index = stores[STORE_SEARCH_INDEX].index('bookId');
        const request = index.openCursor(IDBKeyRange.only(bookId));
        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });
    });
  },

  async getMetadata(bookId: string): Promise<SearchIndexMetadata | undefined> {
    return withTransaction([STORE_SEARCH_METADATA], 'readonly', (stores) => {
      return new Promise<SearchIndexMetadata | undefined>((resolve, reject) => {
        const request = stores[STORE_SEARCH_METADATA].get(bookId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  },

  async setMetadata(metadata: SearchIndexMetadata): Promise<void> {
    return withTransaction([STORE_SEARCH_METADATA], 'readwrite', (stores) => {
      return new Promise<void>((resolve, reject) => {
        const request = stores[STORE_SEARCH_METADATA].put(metadata);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  },

  async getAllMetadata(): Promise<SearchIndexMetadata[]> {
    return withTransaction([STORE_SEARCH_METADATA], 'readonly', (stores) => {
      return new Promise<SearchIndexMetadata[]>((resolve, reject) => {
        const request = stores[STORE_SEARCH_METADATA].getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  },
};
