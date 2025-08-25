# eReader Project Structure

This document outlines the complete directory structure of the eReader capstone project.

## Root Structure
```
eReaderCapstoneProject/
└── eReaderCapstone/
    └── eReader/
        ├── frontend-web/           # React Web Application
        ├── shared/                 # Shared code for all platforms
        ├── PROJECT_STRUCTURE.md   # This file
        └── README.md               # Project overview
```

## Frontend Web (React)
```
frontend-web/
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
├── eslint.config.js
├── README.md
│
├── src/
│   ├── main.jsx                # Entry point
│   ├── App.jsx                 # Main app component (imports from shared)
│   ├── App.css
│   ├── index.css
│   │
│   ├── components/
│   │   ├── Reader/
│   │   │   ├── Reader.jsx      # Reader component (uses shared hooks)
│   │   │   ├── Reader.css
│   │   │   └── index.js
│   │   │
│   │   ├── ChapterView/
│   │   │   ├── ChapterView.jsx
│   │   │   └── ChapterView.css
│   │   │
│   │   ├── Sidebar/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Sidebar.css
│   │   │   └── TableOfContents.jsx
│   │   │
│   │   └── Controls/
│   │       ├── ReadingControls.jsx
│   │       └── Controls.css
│   │
│   └── pages/
│       ├── Home/
│       │   ├── Home.jsx
│       │   └── Home.css
│       │
│       ├── Library/
│       │   ├── Library.jsx
│       │   └── Library.css
│       │
│       ├── Reader/
│       │   ├── Reader.jsx
│       │   └── Reader.css
│       │
│       └── Upload/
│           ├── Upload.jsx
│           └── Upload.css
```

## Shared Code (Cross-Platform)
```
shared/
├── hooks/
│   └── useEPUB.js              # React hook for EPUB management
│
├── contexts/
│   └── LibraryContext.jsx      # React context for book library
│
└── parser/
    ├── package.json
    ├── package-lock.json
    ├── vitest.config.js
    │
    ├── src/
    │   ├── index.js            # Main parser export
    │   ├── EPUBParser.js       # Main EPUB parser class
    │   ├── ZipHandler.js       # ZIP file handling
    │   ├── ContainerParser.js  # EPUB container.xml parser
    │   ├── OPFParser.js        # EPUB OPF file parser
    │   ├── NavigationParser.js # TOC/navigation parser
    │   ├── CSSParser.js        # CSS extraction and processing
    │   ├── FontHandler.js      # Font extraction and embedding
    │   ├── ContentParser.js    # Chapter content parser
    │   ├── test.html           # Standalone test page
    │   │
    │   └── utils/
    │       ├── path.js         # Path utilities
    │       └── xml.js          # XML parsing utilities
    │
    └── test/
        ├── EPUBParser.test.js  # Unit tests
        └── manual/
            └── index.html      # Manual testing page
```

## Key Components & Their Roles

### EPUB Parser (shared/parser/)
- **EPUBParser.js**: Main class that orchestrates EPUB parsing
- **ZipHandler.js**: Handles ZIP file operations (EPUBs are ZIP files)
- **ContainerParser.js**: Parses META-INF/container.xml to find OPF file
- **OPFParser.js**: Parses content.opf file for metadata, manifest, spine
- **NavigationParser.js**: Parses navigation documents (EPUB 2/3 TOC)
- **CSSParser.js**: Extracts and processes CSS from EPUB files
- **FontHandler.js**: Handles embedded fonts in EPUBs

### React Components (frontend-web/)
- **App.jsx**: Main app with routing, imports shared contexts
- **Reader.jsx**: Main reading interface, uses shared hooks
- **useEPUB.js**: Custom hook for EPUB state management (moved to shared)
- **LibraryContext.jsx**: Context for book library management (moved to shared)

## Import Patterns

### Frontend imports from Shared:
```javascript
// In frontend-web/src/App.jsx
import { LibraryProvider } from '../../shared/contexts/LibraryContext';

// In frontend-web/src/components/Reader/Reader.jsx  
import { useEPUB } from '../../../../shared/hooks/useEPUB';
```

### Shared internal imports:
```javascript
// In shared/hooks/useEPUB.js
import { EPUBParser } from '../parser/src/EPUBParser.js';

// In shared/parser/src/EPUBParser.js
import { ZipHandler } from './ZipHandler.js';
import { CSSParser } from './CSSParser.js';
// etc.
```

## Future Extensions

### React Native
When adding React Native, the structure would become:
```
eReader/
├── frontend-web/       # React Web (existing)
├── frontend-mobile/    # React Native (future)
├── backend/           # Backend API (future)
└── shared/            # Cross-platform code (existing)
    ├── hooks/         # Can be used by React Native
    ├── contexts/      # Can be used by React Native  
    ├── parser/        # Platform agnostic
    ├── utils/         # Platform agnostic
    └── types/         # TypeScript types (future)
```

## Technology Stack
- **Frontend**: React + Vite + React Router
- **EPUB Parsing**: Custom JavaScript parser
- **File Handling**: JSZip for ZIP operations
- **Styling**: CSS modules
- **Testing**: Vitest (parser), manual HTML tests
- **State Management**: React Context + Custom Hooks

## Key Features
- ✅ EPUB 2/3 support
- ✅ Navigation/TOC parsing  
- ✅ CSS and font handling
- ✅ Image processing
- ✅ Cross-platform shared code
- 🚧 IndexedDB storage (placeholder)
- 🚧 Reading progress tracking
- 🚧 Backend integration