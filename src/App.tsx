import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ReaderPage from './pages/ReaderPage'
import BookmarksPage from './pages/BookmarksPage'
import SearchPage from './pages/SearchPage'
import SettingsPage from './pages/SettingsPage'
import Layout from './components/Layout'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="read/:bookId" element={<ReaderPage />} />
        <Route path="bookmarks" element={<BookmarksPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}

export default App
