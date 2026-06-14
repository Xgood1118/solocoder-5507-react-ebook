import type { Book } from '../types';
import { usePreferenceStore } from '../store/preferenceStore';
import { THEME_MAP } from '../types';
import { useBookStore } from '../store/bookStore';

interface DuplicateModalProps {
  isOpen: boolean;
  existingBook: Book | null;
  newBook: Book | null;
  onClose: () => void;
}

export default function DuplicateModal({ isOpen, existingBook, newBook, onClose }: DuplicateModalProps) {
  const { theme } = usePreferenceStore();
  const themeConfig = THEME_MAP[theme];
  const updateBook = useBookStore((state) => state.updateBook);
  const addBook = useBookStore((state) => state.addBook);

  if (!isOpen || !existingBook || !newBook) return null;

  const handleOverwrite = () => {
    const updated = {
      ...existingBook,
      chapters: newBook.chapters,
      totalChapters: newBook.chapters.length,
      summary: newBook.summary,
      phash: newBook.phash,
      updatedAt: Date.now(),
    };
    updateBook(updated);
    onClose();
  };

  const handleSkip = () => {
    onClose();
  };

  const handleAddNew = () => {
    addBook({ ...newBook, id: `${newBook.id}-${Date.now()}` });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl p-6 w-full max-w-md mx-4"
        style={{ backgroundColor: themeConfig.bg, color: themeConfig.text }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">检测到重复书籍</h2>
        <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: `${themeConfig.text}08` }}>
          <p className="font-medium">{existingBook.title}</p>
          <p className="text-sm opacity-70">{existingBook.author}</p>
        </div>
        <p className="mb-4 text-sm">
          这本书已经存在于书库中，您想要如何处理？</p>
        <div className="flex flex-col gap-2">
          <button
            onClick={handleOverwrite}
            className="w-full py-2 px-4 rounded-lg font-medium text-white"
            style={{ backgroundColor: themeConfig.accent }}
          >
            覆盖（保留阅读进度，更新内容
          </button>
          <button
            onClick={handleAddNew}
            className="w-full py-2 px-4 rounded-lg font-medium"
            style={{ backgroundColor: `${themeConfig.text}10` }}
          >
            另存为新书
          </button>
          <button
            onClick={handleSkip}
            className="w-full py-2 px-4 rounded-lg font-medium"
            style={{ backgroundColor: `${themeConfig.text}05` }}
          >
            跳过
          </button>
        </div>
      </div>
    </div>
  );
}
