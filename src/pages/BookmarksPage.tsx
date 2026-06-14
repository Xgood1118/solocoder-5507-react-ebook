import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookmarkStore } from '../store/bookmarkStore';
import { useBookStore } from '../store/bookStore';
import { usePreferenceStore } from '../store/preferenceStore';
import { THEME_MAP } from '../types';
import type { Bookmark, Book } from '../types';

export default function BookmarksPage() {
  const { bookmarks, loading, loadBookmarks, updateBookmark, deleteBookmark } = useBookmarkStore();
  const { books } = useBookStore();
  const { theme } = usePreferenceStore();
  const themeConfig = THEME_MAP[theme];
  const navigate = useNavigate();

  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [editNote, setEditNote] = useState('');

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  const bookmarksByBook = bookmarks.reduce((acc, bookmark) => {
    if (!acc[bookmark.bookId]) {
      acc[bookmark.bookId] = [];
    }
    acc[bookmark.bookId].push(bookmark);
    return acc;
  }, {} as Record<string, Bookmark[]>);

  const getBook = (bookId: string): Book | undefined => {
    return books.find((b) => b.id === bookId);
  };

  const handleNavigate = (bookmark: Bookmark) => {
    navigate(`/read/${bookmark.bookId}?chapter=${bookmark.chapterIndex}&offset=${bookmark.charOffset}`);
  };

  const handleEdit = (bookmark: Bookmark) => {
    setEditingBookmark(bookmark);
    setEditNote(bookmark.note);
  };

  const handleSaveEdit = () => {
    if (editingBookmark) {
      updateBookmark({ ...editingBookmark, note: editNote });
      setEditingBookmark(null);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个书签吗？')) {
      deleteBookmark(id);
    }
  };

  if (loading) {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={{ backgroundColor: themeConfig.bg, color: themeConfig.text }}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-transparent" style={{ borderColor: `${themeConfig.accent}30`, borderTopColor: themeConfig.accent }} />
      </div>
    );
  }

  return (
    <div className="h-full p-6 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">我的书签</h2>

        {bookmarks.length === 0 ? (
          <div className="text-center py-20" style={{ color: `${themeConfig.text}50` }}>
            <p className="text-6xl mb-4">🔖</p>
            <p className="text-xl mb-2">还没有书签</p>
            <p className="text-sm">阅读时按 B 键或点击书签按钮添加书签</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(bookmarksByBook).map(([bookId, bookBookmarks]) => {
              const book = getBook(bookId);
              if (!book) return null;

              return (
                <div key={bookId}>
                  <div className="flex items-center gap-3 mb-4 pb-2 border-b" style={{ borderColor: `${themeConfig.text}15` }}>
                    <img
                      src={book.coverImage}
                      alt={book.title}
                      className="w-12 h-16 object-cover rounded shadow"
                    />
                    <div>
                      <h3 className="font-bold">{book.title}</h3>
                      <p className="text-sm opacity-60">{book.author} · {bookBookmarks.length} 个书签</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {bookBookmarks.sort((a, b) => a.chapterIndex - b.chapterIndex).map((bookmark) => {
                      const chapter = book.chapters[bookmark.chapterIndex];
                      const preview = chapter?.content.substring(bookmark.charOffset, bookmark.charOffset + 50) || '';

                      return (
                        <div
                          key={bookmark.id}
                          className="p-4 rounded-xl cursor-pointer transition-all hover:shadow-md"
                          style={{ backgroundColor: `${themeConfig.text}05` }}
                          onClick={() => handleNavigate(bookmark)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-sm font-medium" style={{ color: themeConfig.accent }}>
                              {chapter?.title || `第${bookmark.chapterIndex + 1}章`}
                            </span>
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleEdit(bookmark)}
                                className="w-7 h-7 rounded flex items-center justify-center text-sm opacity-60 hover:opacity-100 transition-opacity"
                                style={{ backgroundColor: `${themeConfig.text}10` }}
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDelete(bookmark.id)}
                                className="w-7 h-7 rounded flex items-center justify-center text-sm opacity-60 hover:opacity-100 transition-opacity text-red-500"
                                style={{ backgroundColor: `${themeConfig.text}10` }}
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                          <p className="text-sm opacity-80 line-clamp-2">
                            {preview}...
                          </p>
                          {bookmark.note && (
                            <p className="text-sm mt-2 p-2 rounded" style={{ backgroundColor: `${themeConfig.accent}15` }}>
                              💬 {bookmark.note}
                            </p>
                          )}
                          <p className="text-xs opacity-50 mt-2">
                            {new Date(bookmark.createdAt).toLocaleString()}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editingBookmark && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setEditingBookmark(null)}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-md mx-4"
            style={{ backgroundColor: themeConfig.bg, color: themeConfig.text }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4">编辑书签备注</h3>
            <textarea
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              placeholder="添加备注..."
              className="w-full h-24 px-3 py-2 rounded-lg border outline-none resize-none mb-4"
              style={{
                backgroundColor: `${themeConfig.text}08`,
                borderColor: `${themeConfig.text}20`,
                color: themeConfig.text,
              }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setEditingBookmark(null)}
                className="flex-1 py-2 rounded-lg font-medium"
                style={{ backgroundColor: `${themeConfig.text}10` }}
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 py-2 rounded-lg font-medium text-white"
                style={{ backgroundColor: themeConfig.accent }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
