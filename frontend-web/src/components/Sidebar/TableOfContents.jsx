// frontend-web/src/components/Sidebar/TableOfContents.jsx
import React from 'react';

const TableOfContents = ({ items, onNavigate, currentChapter, spine }) => {
  const renderNavItem = (item, level = 0) => {
    // Find which spine item this TOC entry points to
    const spineIndex = spine.findIndex(
      spineItem => spineItem.href.split('#')[0] === item.href?.split('#')[0]
    );
    
    const isActive = spineIndex === currentChapter;
    
    return (
      <div key={item.href || item.title} className="toc-item-wrapper">
        <div
          className={`toc-item level-${level} ${isActive ? 'active' : ''}`}
          onClick={() => item.href && onNavigate(item.href)}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
        >
          {item.title}
        </div>
        
        {item.children && item.children.length > 0 && (
          <div className="toc-children">
            {item.children.map(child => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="table-of-contents">
      {items.map(item => renderNavItem(item))}
    </nav>
  );
};

export default TableOfContents;