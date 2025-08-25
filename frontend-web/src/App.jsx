// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LibraryProvider } from '../../shared/contexts/LibraryContext';
import Home from './pages/Home/Home';
import Library from './pages/Library/Library';
import ReaderPage from './pages/Reader/Reader';
import Upload from './pages/Upload/Upload';

function App() {
  return (
    <Router>
      <LibraryProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/library" element={<Library />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/read/:bookId" element={<ReaderPage />} />
        </Routes>
      </LibraryProvider>
    </Router>
  );
}

export default App;