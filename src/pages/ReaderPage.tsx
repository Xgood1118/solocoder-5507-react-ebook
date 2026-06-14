import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useBookStore } from '../store/bookStore';
import { useReaderStore } from '../store/readerStore';
import { usePreferenceStore } from '../store/preferenceStore';
import { useBookmarkStore } from '../store/bookmarkStore';
import { THEME_MAP, FONT_SIZE_MAP, LINE_HEIGHT_MAP } from '../types';

const CHARS_PER_PAGE = 1000;
const TOOLBAR_HIDE_DELAY = 3000;

export default function ReaderPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramChapter = searchParams.get('chapter');
  const paramOffset = searchParams.get('offset');

  const { books } = useBookStore();
  const {
    currentBook,
    currentChapter,
    charOffset,
    toolbarVisible,
    showBookmarkModal,
    bookmarkNote,
    setCurrentBook,
    nextChapter,
    prevChapter,
    goToChapter,
    setCharOffset,
    toggleToolbar,
    showAddBookmark,
    hideAddBookmark,
    setBookmarkNote,
    startSession,
    endSession,
    saveProgress,
  } = useReaderStore();

  const { fontSize, lineHeight, theme } = usePreferenceStore();
  const { addBookmark } = useBookmarkStore();

  const themeConfig = THEME_MAP[theme];
  const contentRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [progressSliderValue, setProgressSliderValue] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const book = books.find((b) => b.id === bookId) || currentBook;
  const chapter = book?.chapters[currentChapter];

  useEffect(() => {
    if (bookId && !currentBook) {
      const foundBook = books.find((b) => b.id === bookId);
      if (foundBook) {
        setCurrentBook(foundBook);
      }
    }
  }, [bookId, books, currentBook, setCurrentBook]);

  useEffect(() => {
    if (book && paramChapter !== null) {
      const chapterIdx = parseInt(paramChapter);
      if (!isNaN(chapterIdx) && chapterIdx >= 0 && chapterIdx < book.chapters.length) {
        goToChapter(chapterIdx);
        if (paramOffset !== null) {
          const offset = parseInt(paramOffset);
          if (!isNaN(offset) && offset >= 0) {
            setCharOffset(offset);
          }
        }
      }
    }
  }, [book, paramChapter, paramOffset, goToChapter, setCharOffset]);

  useEffect(() => {
    startSession();
    return () => {
      endSession();
      saveProgress();
    };
  }, [startSession, endSession, saveProgress]);

  const resetHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    toggleToolbar(true);
    hideTimerRef.current = setTimeout(() => {
      toggleToolbar(false);
    }, TOOLBAR_HIDE_DELAY);
  }, [toggleToolbar]);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [resetHideTimer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      resetHideTimer();

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevChapter();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextChapter();
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        setCharOffset(Math.max(0, charOffset - CHARS_PER_PAGE));
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        const chapterContent = chapter?.content || '';
        setCharOffset(Math.min(chapterContent.length, charOffset + CHARS_PER_PAGE));
      } else if (e.key === 'Home') {
        e.preventDefault();
        setCharOffset(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        const chapterContent = chapter?.content || '';
        setCharOffset(chapterContent.length);
      } else if (e.key === 'Escape') {
        navigate('/');
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        showAddBookmark();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevChapter, nextChapter, charOffset, chapter, setCharOffset, showAddBookmark, navigate, resetHideTimer]);

  const handleContentClick = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const centerZone = rect.height * 0.4;
    const centerStart = rect.height * 0.3;
    const centerEnd = centerStart + centerZone;

    if (clickY >= centerStart && clickY <= centerEnd) {
      resetHideTimer();
    } else if (clickY < rect.height * 0.5) {
      setCharOffset(Math.max(0, charOffset - CHARS_PER_PAGE));
    } else {
      const chapterContent = chapter?.content || '';
      setCharOffset(Math.min(chapterContent.length, charOffset + CHARS_PER_PAGE));
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProgressSliderValue(parseInt(e.target.value));
  };

  const handleSliderMouseDown = () => {
    setIsDragging(true);
  };

  const handleSliderMouseUp = () => {
    if (isDragging && book) {
      const totalProgress = progressSliderValue / 100;
      const targetChapter = Math.floor(totalProgress * book.totalChapters);
      goToChapter(Math.min(targetChapter, book.totalChapters - 1));
    }
    setIsDragging(false);
  };

  const handleAddBookmark = async () => {
    if (book) {
      await addBookmark({
        bookId: book.id,
        chapterIndex: currentChapter,
        charOffset,
        note: bookmarkNote,
      });
      hideAddBookmark();
    }
  };

  if (!book || !chapter) {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={{ backgroundColor: themeConfig.bg, color: themeConfig.text }}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-transparent" style={{ borderColor: `${themeConfig.accent}30`, borderTopColor: themeConfig.accent }} />
      </div>
    );
  }

  const pageContent = chapter.content.substring(charOffset, charOffset + CHARS_PER_PAGE * 3);
  const overallProgress = ((currentChapter + (charOffset / Math.max(chapter.content.length, 1))) / book.totalChapters) * 100;

  const sliderProgress = isDragging ? progressSliderValue : overallProgress;

  return (
    <div
      className="h-full flex flex-col relative select-none"
      style={{ backgroundColor: themeConfig.bg, color: themeConfig.text }}
      onMouseMove={resetHideTimer}
    >
      <div
        className={`absolute top-0 left-0 right-0 z-10 transition-transform duration-300 ${
          toolbarVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
        style={{ backgroundColor: `${themeConfig.bg}ee` }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: `${themeConfig.text}15` }}>
          <button
            onClick={() => navigate('/')}
            className="px-3 py-1.5 rounded-lg hover:bg-black/5 transition-colors"
          >
            ← 返回
          </button>
          <div className="flex-1 text-center px-4">
            <h2 className="font-medium truncate">{book.title}</h2>
            <p className="text-xs opacity-60">{chapter.title}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={showAddBookmark}
              className="px-3 py-1.5 rounded-lg hover:bg-black/5 transition-colors"
              title="添加书签 (B)"
            >
              🔖
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="px-3 py-1.5 rounded-lg hover:bg-black/5 transition-colors"
              title="阅读设置"
            >
              ⚙️
            </button>
          </div>
        </div>
      </div>

      <div
        ref={contentRef}
        className="flex-1 overflow-auto cursor-pointer"
        style={{
          padding: '80px 15%',
          fontSize: FONT_SIZE_MAP[fontSize],
          lineHeight: LINE_HEIGHT_MAP[lineHeight],
        }}
        onClick={handleContentClick}
      >
        <h1 className="text-2xl font-bold mb-6 text-center" style={{ color: themeConfig.accent }}>
          {chapter.title}
        </h1>
        <div className="whitespace-pre-wrap">{pageContent}</div>
        {charOffset + CHARS_PER_PAGE * 3 >= chapter.content.length && (
          <div className="mt-8 text-center opacity-50">
            --- 本章结束 ---
          </div>
        )}
      </div>

      <div
        className={`absolute bottom-0 left-0 right-0 z-10 transition-transform duration-300 ${
          toolbarVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ backgroundColor: `${themeConfig.bg}ee` }}
      >
        <div className="px-4 py-3 border-t" style={{ borderColor: `${themeConfig.text}15` }}>
          <div className="flex items-center gap-4 mb-2">
            <span className="text-sm opacity-60 w-16">{currentChapter + 1}/{book.totalChapters}</span>
            <input
              type="range"
              min="0"
              max="100"
              value={sliderProgress}
              onChange={handleSliderChange}
              onMouseDown={handleSliderMouseDown}
              onMouseUp={handleSliderMouseUp}
              onTouchStart={handleSliderMouseDown}
              onTouchEnd={handleSliderMouseUp}
              className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, ${themeConfig.accent} ${sliderProgress}%, ${themeConfig.text}20 ${sliderProgress}%)`,
              }}
            />
            <span className="text-sm opacity-60 w-16 text-right">{overallProgress.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <button
              onClick={prevChapter}
              disabled={currentChapter === 0}
              className="px-4 py-2 rounded-lg hover:bg-black/5 transition-colors disabled:opacity-30"
            >
              ← 上一章
            </button>
            <span className="text-sm opacity-60 self-center">
              {new Date(book.lastReadTime).toLocaleDateString()} 阅读
            </span>
            <button
              onClick={nextChapter}
              disabled={currentChapter >= book.totalChapters - 1}
              className="px-4 py-2 rounded-lg hover:bg-black/5 transition-colors disabled:opacity-30"
            >
              下一章 →
            </button>
          </div>
        </div>
      </div>

      {showBookmarkModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={hideAddBookmark}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-md mx-4"
            style={{ backgroundColor: themeConfig.bg, color: themeConfig.text }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4">添加书签</h3>
            <p className="text-sm opacity-70 mb-4">
              {chapter.title} · 第 {charOffset} 字符
            </p>
            <textarea
              value={bookmarkNote}
              onChange={(e) => setBookmarkNote(e.target.value)}
              placeholder="添加备注（可选）..."
              className="w-full h-24 px-3 py-2 rounded-lg border outline-none resize-none mb-4"
              style={{
                backgroundColor: `${themeConfig.text}08`,
                borderColor: `${themeConfig.text}20`,
                color: themeConfig.text,
              }}
            />
            <div className="flex gap-3">
              <button
                onClick={hideAddBookmark}
                className="flex-1 py-2 rounded-lg font-medium"
                style={{ backgroundColor: `${themeConfig.text}10` }}
              >
                取消
              </button>
              <button
                onClick={handleAddBookmark}
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
