import React, { useState } from 'react';
import { useEPUB } from '../../hooks/useEPUB';
import Sidebar from '../Sidebar/Sidebar';
import ChapterView from '../ChapterView/ChapterView';
import ReadingControls from '../Controls/ReadingControls';
import './Reader.css';

const Reader = () => {
  const {
    book,
    currentChapter,
    chapterContent,
    loading,
    error,
    cssEnabled,
    setCssEnabled,
    loadEPUB,
    loadChapter,
    loadChapterByHref,
    nextChapter,
    prevChapter,
    totalChapters
  } = useEPUB();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [fontSize, setFontSize] = useState(16);
  const [theme, setTheme] = useState('light');

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.epub')) {
      await loadEPUB(file);
      setSidebarOpen(true);
    }
  };

  if (!book) {
    return (
      <div className="reader-welcome">
        <div className="upload-container">
          <h1>EPUB Reader</h1>
          <p>Upload an EPUB file to start reading</p>
          <label htmlFor="file-input" className="file-input-label">
            Choose EPUB File
          </label>
          <input
            id="file-input"
            type="file"
            accept=".epub"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`reader-container theme-${theme}`}>
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        book={book}
        currentChapter={currentChapter}
        onNavigate={loadChapterByHref}
        onChapterSelect={loadChapter}
      />
      
      <div className="reader-main">
        <ReadingControls
          currentChapter={currentChapter}
          totalChapters={totalChapters}
          onPrevious={prevChapter}
          onNext={nextChapter}
          fontSize={fontSize}
          onFontSizeChange={setFontSize}
          theme={theme}
          onThemeChange={setTheme}
          cssEnabled={cssEnabled}
          onCssToggle={() => setCssEnabled(!cssEnabled)}
        />
        
        <ChapterView
          content={chapterContent}
          loading={loading}
          error={error}
          fontSize={fontSize}
          cssEnabled={cssEnabled}
        />
      </div>
    </div>
  );
};

export default Reader;