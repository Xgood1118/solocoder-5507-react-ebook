import { useEffect, useState } from 'react';
import { useBookStore } from '../store/bookStore';
import { usePreferenceStore } from '../store/preferenceStore';
import { THEME_MAP } from '../types';
import BookCard from '../components/BookCard';
import ImportModal from '../components/ImportModal';
import DuplicateModal from '../components/DuplicateModal';
import type { Book } from '../types';

export default function HomePage() {
  const { books, loading, loadBooks, deleteBook } = useBookStore();
  const { theme } = usePreferenceStore();
  const themeConfig = THEME_MAP[theme];

  const [showImport, setShowImport] = useState(false);
  const [duplicateData, setDuplicateData] = useState<{ existing: Book; new: Book } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Book | null>(null);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const handleDuplicate = (existingBook: Book, newBook: Book) => {
    setShowImport(false);
    setDuplicateData({ existing: existingBook, new: newBook });
  };

  const handleDeleteBook = (book: Book) => {
    setShowDeleteConfirm(book);
  };

  const confirmDelete = () => {
    if (showDeleteConfirm) {
      deleteBook(showDeleteConfirm.id);
      setShowDeleteConfirm(null);
    }
  };

  return (
    <div className="h-full p-6 overflow-auto">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">我的书架</h2>
            <p className="opacity-60 mt-1">{books.length} 本书</p>
          </div>
          <button
            onClick={() => setShowImport(true)}
            className="w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg transition-transform hover:scale-110"
            style={{ backgroundColor: themeConfig.accent }}
          >
            +
          </button>
        </div>

        {loading && books.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-transparent" style={{ borderColor: `${themeConfig.accent}30`, borderTopColor: themeConfig.accent }} />
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-20" style={{ color: `${themeConfig.text}50` }}>
            <p className="text-6xl mb-4">📚</p>
            <p className="text-xl mb-2">书架空空如也</p>
            <p className="text-sm">点击右上角 + 号导入您的第一本书</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onDelete={handleDeleteBook}
              />
            ))}
          </div>
        )}
      </div>

      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onDuplicate={handleDuplicate}
      />

      <DuplicateModal
        isOpen={!!duplicateData}
        existingBook={duplicateData?.existing || null}
        newBook={duplicateData?.new || null}
        onClose={() => setDuplicateData(null)}
      />

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowDeleteConfirm(null)}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-sm mx-4"
            style={{ backgroundColor: themeConfig.bg, color: themeConfig.text }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-2">确认删除</h3>
            <p className="mb-4 opacity-70">
              确定要删除《{showDeleteConfirm.title}》吗？此操作无法撤销。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-2 rounded-lg font-medium"
                style={{ backgroundColor: `${themeConfig.text}10` }}
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2 rounded-lg font-medium text-white"
                style={{ backgroundColor: '#ef4444' }}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
