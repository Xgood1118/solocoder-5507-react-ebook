import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { usePreferenceStore } from '../store/preferenceStore';
import { THEME_MAP } from '../types';

export default function Layout() {
  const location = useLocation();
  const { theme } = usePreferenceStore();
  const themeConfig = THEME_MAP[theme];

  const isReaderPage = location.pathname.startsWith('/read/');

  if (isReaderPage) {
    return <Outlet />;
  }

  return (
    <div
      className="h-full flex flex-col"
      style={{ backgroundColor: themeConfig.bg, color: themeConfig.text }}
    >
      <header
        className="flex items-center justify-between px-4 py-3 border-b shadow-sm"
        style={{ borderColor: `${themeConfig.text}15` }}
      >
        <h1 className="text-xl font-bold">📚 电子书阅读器</h1>
        <nav className="flex gap-2">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg transition-colors ${
                isActive ? 'text-white' : 'hover:bg-black/5'
              }`
            }
            style={({ isActive }) =>
              isActive ? { backgroundColor: themeConfig.accent } : {}
            }
          >
            书架
          </NavLink>
          <NavLink
            to="/bookmarks"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg transition-colors ${
                isActive ? 'text-white' : 'hover:bg-black/5'
              }`
            }
            style={({ isActive }) =>
              isActive ? { backgroundColor: themeConfig.accent } : {}
            }
          >
            书签
          </NavLink>
          <NavLink
            to="/search"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg transition-colors ${
                isActive ? 'text-white' : 'hover:bg-black/5'
              }`
            }
            style={({ isActive }) =>
              isActive ? { backgroundColor: themeConfig.accent } : {}
            }
          >
            搜索
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg transition-colors ${
                isActive ? 'text-white' : 'hover:bg-black/5'
              }`
            }
            style={({ isActive }) =>
              isActive ? { backgroundColor: themeConfig.accent } : {}
            }
          >
            设置
          </NavLink>
        </nav>
      </header>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
