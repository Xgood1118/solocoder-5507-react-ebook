import { useState, useRef } from 'react';
import { useBookStore } from '../store/bookStore';
import { usePreferenceStore } from '../store/preferenceStore';
import { THEME_MAP } from '../types';
import type { Book } from '../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDuplicate: (existingBook: Book, newBook: Book) => void;
}

export default function ImportModal({ isOpen, onClose, onDuplicate }: ImportModalProps) {
  const importFromFile = useBookStore((state) => state.importFromFile);
  const importFromUrl = useBookStore((state) => state.importFromUrl);
  const importResult = useBookStore((state) => state.importResult);
  const clearImportResult = useBookStore((state) => state.clearImportResult);
  const loading = useBookStore((state) => state.loading);
  const error = useBookStore((state) => state.error);
  const setError = useBookStore((state) => state.setError);

  const [url, setUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { theme } = usePreferenceStore();
  const themeConfig = THEME_MAP[theme];

  if (!isOpen) return null;

  const handleFileSelect = async (file: File) => {
    setError(null);
    const result = await importFromFile(file);
    if (result.success && result.duplicate && result.existingBook && result.book) {
      onDuplicate(result.existingBook, result.book);
    }
  };

  const handleUrlImport = async () => {
    if (!url.trim()) return;
    setError(null);
    importFromUrl(url.trim()).then((result) => {
      if (result.success && result.duplicate && result.existingBook && result.book) {
        onDuplicate(result.existingBook, result.book);
      }
    });
    setUrl('');
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    } else if (e.dataTransfer.getData('text/uri-list')) {
      const droppedUrl = e.dataTransfer.getData('text/uri-list');
      setUrl(droppedUrl);
    }
  };

  const handleClose = () => {
    clearImportResult();
    setError(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={handleClose}
    >
      <div
        className="rounded-2xl p-6 w-full max-w-md mx-4"
        style={{ backgroundColor: themeConfig.bg, color: themeConfig.text }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">导入书籍</h2>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
            {error}
          </div>
        )}

        {importResult?.success && !importResult.duplicate && importResult.book && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: '#f0fdf4', color: '#166534' }}>
            成功导入: {importResult.book.title}
          </div>
        )}

        <div
          className="mb-4">
          <input
            type="file"
            accept=".txt,.epub"
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl font-medium transition-colors text-white"
            style={{ backgroundColor: themeConfig.accent }}
          >
            {loading ? '导入中...' : '选择本地文件'}
          </button>
        </div>

        <div
          className={`mb-4 p-6 border-2 border-dashed rounded-xl text-center py-8 cursor-pointer transition-colors`}
          style={{ borderColor: dragActive ? themeConfig.accent : `${themeConfig.text}30` }}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <p className="text-lg font-medium">拖拽文件或 URL 到这里</p>
          <p className="text-sm opacity-60">支持 .txt 和 .epub 格式</p>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="输入远程 URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border outline-none"
            style={{
              backgroundColor: `${themeConfig.text}08`,
              borderColor: `${themeConfig.text}20`,
              color: themeConfig.text,
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleUrlImport()}
          />
          <button
            onClick={handleUrlImport}
            disabled={loading || !url.trim()}
            className="px-4 py-2 rounded-lg font-medium text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: themeConfig.accent }}
          >
            导入
          </button>
        </div>

        <button
          onClick={handleClose}
          className="mt-4 w-full py-2 rounded-lg transition-colors"
          style={{ backgroundColor: `${themeConfig.text}10` }}
        >
          关闭
        </button>
      </div>
    </div>
  );
}
