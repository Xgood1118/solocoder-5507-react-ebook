import { useState, useRef } from 'react';
import { usePreferenceStore } from '../store/preferenceStore';
import { THEME_MAP, FONT_SIZE_MAP, LINE_HEIGHT_MAP, FontSize, LineHeight, ThemeVariant } from '../types';

const fontSizes: { value: FontSize; label: string }[] = [
  { value: 'small', label: '小' },
  { value: 'medium', label: '中' },
  { value: 'large', label: '大' },
  { value: 'xlarge', label: '特大' },
];

const lineHeights: { value: LineHeight; label: string }[] = [
  { value: 'compact', label: '紧凑' },
  { value: 'normal', label: '标准' },
  { value: 'loose', label: '宽松' },
];

const themes: { value: ThemeVariant; label: string }[] = [
  { value: 'light1', label: '明亮白' },
  { value: 'light2', label: '护眼米黄' },
  { value: 'light3', label: '清新绿' },
  { value: 'dark1', label: '深夜蓝' },
  { value: 'dark2', label: '暗夜紫' },
  { value: 'dark3', label: '商务蓝' },
];

export default function SettingsPage() {
  const { fontSize, lineHeight, theme, setFontSize, setLineHeight, setTheme, resetPreferences, exportPreferences, importPreferences } = usePreferenceStore();
  const themeConfig = THEME_MAP[theme];

  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = exportPreferences();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reader-preferences-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const success = importPreferences(content);
        if (success) {
          setImportStatus({ type: 'success', message: '偏好设置导入成功！' });
        } else {
          setImportStatus({ type: 'error', message: '导入失败：文件格式不正确' });
        }
      } catch (error) {
        setImportStatus({ type: 'error', message: '导入失败：无法读取文件' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="h-full p-6 overflow-auto">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">阅读设置</h2>

        <div className="space-y-8">
          <div className="p-6 rounded-2xl" style={{ backgroundColor: `${themeConfig.text}05` }}>
            <h3 className="font-bold mb-4">字号大小</h3>
            <div className="grid grid-cols-4 gap-3">
              {fontSizes.map((size) => (
                <button
                  key={size.value}
                  onClick={() => setFontSize(size.value)}
                  className="py-3 px-4 rounded-xl font-medium transition-all"
                  style={{
                    backgroundColor: fontSize === size.value ? themeConfig.accent : `${themeConfig.text}10`,
                    color: fontSize === size.value ? 'white' : themeConfig.text,
                    fontSize: FONT_SIZE_MAP[size.value],
                  }}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-2xl" style={{ backgroundColor: `${themeConfig.text}05` }}>
            <h3 className="font-bold mb-4">行间距</h3>
            <div className="grid grid-cols-3 gap-3">
              {lineHeights.map((lh) => (
                <button
                  key={lh.value}
                  onClick={() => setLineHeight(lh.value)}
                  className="py-3 px-4 rounded-xl font-medium transition-all"
                  style={{
                    backgroundColor: lineHeight === lh.value ? themeConfig.accent : `${themeConfig.text}10`,
                    color: lineHeight === lh.value ? 'white' : themeConfig.text,
                    lineHeight: LINE_HEIGHT_MAP[lh.value],
                  }}
                >
                  {lh.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-2xl" style={{ backgroundColor: `${themeConfig.text}05` }}>
            <h3 className="font-bold mb-4">阅读主题</h3>
            <div className="grid grid-cols-3 gap-3">
              {themes.map((t) => {
                const tConfig = THEME_MAP[t.value];
                return (
                  <button
                    key={t.value}
                    onClick={() => setTheme(t.value)}
                    className="py-4 px-3 rounded-xl font-medium transition-all flex flex-col items-center gap-2"
                    style={{
                      backgroundColor: tConfig.bg,
                      color: tConfig.text,
                      border: `2px solid ${theme === t.value ? tConfig.accent : 'transparent'}`,
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-full"
                      style={{ backgroundColor: tConfig.accent }}
                    />
                    <span className="text-sm">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="p-6 rounded-2xl"
            style={{ backgroundColor: `${themeConfig.text}05` }}
          >
            <h3 className="font-bold mb-4">预览效果</h3>
            <div
              className="p-6 rounded-xl"
              style={{
                backgroundColor: themeConfig.bg,
                color: themeConfig.text,
                fontSize: FONT_SIZE_MAP[fontSize],
                lineHeight: LINE_HEIGHT_MAP[lineHeight],
              }}
            >
              <p>
                这是一段示例文字，用来预览当前的阅读效果。您可以调整上方的字号、行间距和主题，找到最舒适的阅读体验。
              </p>
              <p className="mt-4">
                良好的阅读设置可以减少眼睛疲劳，提高阅读效率。建议根据环境光线选择合适的主题，在明亮环境下使用亮色主题，在暗光环境下使用暗色主题。
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl" style={{ backgroundColor: `${themeConfig.text}05` }}>
            <h3 className="font-bold mb-4">数据同步</h3>
            <p className="text-sm opacity-70 mb-4">
              所有数据都存储在您的浏览器本地。您可以导出偏好设置，在其他设备上导入以同步配置。
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleExport}
                className="flex-1 py-3 rounded-xl font-medium text-white"
                style={{ backgroundColor: themeConfig.accent }}
              >
                导出偏好设置
              </button>
              <input
                type="file"
                accept=".json"
                ref={fileInputRef}
                className="hidden"
                onChange={handleImport}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-3 rounded-xl font-medium"
                style={{ backgroundColor: `${themeConfig.text}10` }}
              >
                导入偏好设置
              </button>
            </div>
            {importStatus && (
              <p
                className={`mt-3 text-sm ${importStatus.type === 'success' ? 'text-green-500' : 'text-red-500'}`}
                style={{ color: importStatus.type === 'success' ? '#22c55e' : '#ef4444' }}
              >
                {importStatus.message}
              </p>
            )}
          </div>

          <div className="p-6 rounded-2xl" style={{ backgroundColor: `${themeConfig.text}05` }}>
            <h3 className="font-bold mb-4">重置设置</h3>
            <p className="text-sm opacity-70 mb-4">
              将所有设置恢复为默认值。此操作不会影响您的书籍和书签数据。
            </p>
            <button
              onClick={() => {
                if (confirm('确定要重置所有设置吗？')) {
                  resetPreferences();
                }
              }}
              className="py-3 px-6 rounded-xl font-medium text-white"
              style={{ backgroundColor: '#ef4444' }}
            >
              重置为默认
            </button>
          </div>
        </div>

        <div className="mt-8 p-4 rounded-xl text-center text-sm opacity-60">
          <p>快捷键说明：</p>
          <p className="mt-2">
            ← → 翻章 | PageUp/PageDown 翻页 | Home/End 章节首尾 | B 添加书签 | ESC 返回
          </p>
        </div>
      </div>
    </div>
  );
}
