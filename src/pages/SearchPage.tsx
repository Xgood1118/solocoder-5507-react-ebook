import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearchStore } from '../store/searchStore';
import { useBookStore } from '../store/bookStore';
import { usePreferenceStore } from '../store/preferenceStore';
import { THEME_MAP } from '../types';
import { useReaderStore } from '../store/readerStore';

export default function SearchPage() {
  const { results, searching, indexing, indexProgress, search, buildAllIndexes, clearResults, setSearchQuery, searchQuery } = useSearchStore();
  const { books } = useBookStore();
  const { theme } = usePreferenceStore();
  const themeConfig = THEME_MAP[theme];
  const navigate = useNavigate();
  const { setCurrentBook } = useReaderStore();

  const inputRef = useRef<HTMLInputElement>(null);
  const [localQuery, setLocalQuery] = useState('');

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (localQuery.trim()) {
      setSearchQuery(localQuery.trim());
      search(localQuery.trim());
    }
  };

  const handleBuildIndex = () => {
    buildAllIndexes();
  };

  const handleResultClick = (bookId: string, chapterIndex: number, charOffset: number) => {
    const book = books.find((b) => b.id === bookId);
    if (book) {
      setCurrentBook(book);
      navigate(`/read/${bookId}?chapter=${chapterIndex}&offset=${charOffset}`);
    }
  };

  const highlightText = (text: string, start: number, end: number) => {
    return (
      <>
        {text.substring(0, start)}
        <mark className="px-0.5 rounded" style={{ backgroundColor: `${themeConfig.accent}40` }}>
          {text.substring(start, end)}
        </mark>
        {text.substring(end)}
      </>
    );
  };

  return (
    <div className="h-full p-6 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">全文搜索</h2>

        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              placeholder="输入关键词搜索..."
              className="flex-1 px-4 py-3 rounded-xl border outline-none"
              style={{
                backgroundColor: `${themeConfig.text}08`,
                borderColor: `${themeConfig.text}20`,
                color: themeConfig.text,
              }}
            />
            <button
              type="submit"
              disabled={searching || !localQuery.trim()}
              className="px-6 py-3 rounded-xl font-medium text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: themeConfig.accent }}
            >
              {searching ? '搜索中...' : '搜索'}
            </button>
          </div>
        </form>

        {indexing && (
          <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: `${themeConfig.accent}15` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium" style={{ color: themeConfig.accent }}>正在构建搜索索引...</span>
              <span className="text-sm">{indexProgress.toFixed(0)}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${themeConfig.text}20` }}>
              <div
                className="h-full transition-all duration-300"
                style={{ width: `${indexProgress}%`, backgroundColor: themeConfig.accent }}
              />
            </div>
          </div>
        )}

        {books.length > 0 && (
          <div className="mb-6">
            <button
              onClick={handleBuildIndex}
              disabled={indexing}
              className="text-sm underline opacity-70 hover:opacity-100 transition-opacity"
              style={{ color: themeConfig.accent }}
            >
              {indexing ? '索引构建中...' : '重建搜索索引'}
            </button>
          </div>
        )}

        {searching && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-transparent" style={{ borderColor: `${themeConfig.accent}30`, borderTopColor: themeConfig.accent }} />
          </div>
        )}

        {!searching && results.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm opacity-60">找到 {results.length} 个结果</p>
            {results.map((result, index) => (
              <div
                key={`${result.bookId}-${result.chapterIndex}-${result.charOffset}-${index}`}
                className="p-4 rounded-xl cursor-pointer transition-all hover:shadow-md"
                style={{ backgroundColor: `${themeConfig.text}05` }}
                onClick={() => handleResultClick(result.bookId, result.chapterIndex, result.charOffset)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium" style={{ color: themeConfig.accent }}>
                    {result.bookTitle}
                  </span>
                  <span className="text-xs opacity-50">·</span>
                  <span className="text-xs opacity-60">
                    {result.chapterTitle}
                  </span>
                </div>
                <p className="text-sm opacity-80">
                  {highlightText(result.context, result.highlightStart, result.highlightEnd)}
                </p>
              </div>
            ))}
          </div>
        )}

        {!searching && searchQuery && results.length === 0 && (
          <div className="text-center py-12" style={{ color: `${themeConfig.text}50` }}>
            <p className="text-4xl mb-4">🔍</p>
            <p className="text-lg">没有找到相关结果</p>
            <p className="text-sm mt-2">试试其他关键词</p>
          </div>
        )}

        {!searching && !searchQuery && (
          <div className="text-center py-12" style={{ color: `${themeConfig.text}50` }}>
            <p className="text-4xl mb-4">📖</p>
            <p className="text-lg">输入关键词开始搜索</p>
            <p className="text-sm mt-2">支持搜索书名、章节标题和正文内容</p>
          </div>
        )}

        {results.length > 0 && (
          <button
            onClick={clearResults}
            className="mt-6 text-sm underline opacity-70 hover:opacity-100 transition-opacity"
            style={{ color: themeConfig.accent }}
          >
            清除搜索结果
          </button>
        )}
      </div>
    </div>
  );
}
