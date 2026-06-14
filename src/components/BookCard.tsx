import { useNavigate } from 'react-router-dom';
import type { Book } from '../types';
import { usePreferenceStore } from '../store/preferenceStore';
import { THEME_MAP } from '../types';

interface BookCardProps {
  book: Book;
  onDelete?: (book: Book) => void;
}

export default function BookCard({ book, onDelete }: BookCardProps) {
  const navigate = useNavigate();
  const { theme } = usePreferenceStore();
  const themeConfig = THEME_MAP[theme];

  const progressPercent = book.readingProgress * 100;

  const handleClick = () => {
    navigate(`/read/${book.id}`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(book);
    }
  };

  return (
    <div
      className="rounded-xl shadow-lg overflow-hidden cursor-pointer transition-transform hover:scale-105 hover:shadow-xl"
      style={{ backgroundColor: `${themeConfig.text}08` }}
      onClick={handleClick}
    >
      <div className="relative">
        <img
          src={book.coverImage}
          alt={book.title}
          className="w-full h-48 object-cover"
        />
        {onDelete && (
          <button
            onClick={handleDelete}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white text-sm flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
            style={{ backgroundColor: '#ef4444' }}
          >
            ×
          </button>
        )}
        <div
          className="absolute bottom-0 left-0 right-0 h-1"
          style={{ backgroundColor: `${themeConfig.text}20` }}
        >
          <div
            className="h-full transition-all"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: themeConfig.accent,
            }}
          />
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-bold text-lg truncate" title={book.title}>
          {book.title}
        </h3>
        <p
          className="text-sm opacity-70 truncate"
          style={{ color: themeConfig.text }}
        >
          {book.author}
        </p>
        <div className="mt-2 text-xs opacity-60 truncate" style={{ color: themeConfig.text }}>
          读到: {book.lastChapterTitle || '开始'}
        </div>
        <div className="mt-1 flex justify-between text-xs opacity-50">
          <span>{progressPercent.toFixed(1)}%</span>
          <span>{book.totalChapters} 章</span>
        </div>
      </div>
    </div>
  );
}
