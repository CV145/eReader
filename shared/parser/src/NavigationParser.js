/*
 Parses the table of contents (TOC) from EPUB files. It handles both EPUB 2 and EPUB 3 formats.

 EPUB 3: Uses nav.xhtml (HTML5 format)
 EPUB 2: Uses toc.ncx (XML format)
*/
export class NavigationParser {
    constructor(zipHandler, manifest, opfDir) {
      this.zipHandler = zipHandler;
      this.manifest = manifest;
      this.opfDir = opfDir;
    }
  
    async parse() {
      // Try EPUB 3 navigation first (it's better)
      const navItem = this.findNavigationDocument();
      if (navItem) {
        console.log('✓ Found EPUB 3 navigation document');
        return await this.parseEPUB3Navigation(navItem);
      }
  
      // Fall back to EPUB 2 NCX
      const ncxItem = this.findNCXDocument();
      if (ncxItem) {
        console.log('✓ Found EPUB 2 NCX document');
        return await this.parseEPUB2Navigation(ncxItem);
      }
  
      console.warn('⚠ No navigation document found');
      return this.generateFallbackNavigation();
    }
  
    findNavigationDocument() {
      // EPUB 3: Look for item with properties="nav"
      return Object.values(this.manifest).find(item => item.isNav);
    }
  
    findNCXDocument() {
      // EPUB 2: Look for NCX file (media-type="application/x-dtbncx+xml")
      return Object.values(this.manifest).find(
        item => item.mediaType === 'application/x-dtbncx+xml'
      );
    }
  
    async parseEPUB3Navigation(navItem) {
      const navContent = await this.zipHandler.getTextFile(navItem.href);
      const parser = new DOMParser();
      const doc = parser.parseFromString(navContent, 'text/html');
  
      // Find the TOC nav element (required in EPUB 3)
      const tocNav = doc.querySelector('nav[epub\\:type="toc"], nav[role="doc-toc"], nav');
      
      if (!tocNav) {
        console.warn('No TOC nav found in navigation document');
        return [];
      }
  
      // Parse the nested list structure
      const tocList = tocNav.querySelector('ol, ul');
      if (!tocList) return [];
  
      return this.parseNavList(tocList, navItem.href);
    }
  
    parseNavList(listElement, navPath) {
      const items = [];
      const listItems = listElement.children;
  
      for (const li of listItems) {
        if (li.tagName !== 'LI') continue;
  
        const item = {};
  
        // Find the link
        const link = li.querySelector('a');
        if (link) {
          item.title = link.textContent.trim();
          const href = link.getAttribute('href');
          
          if (href) {
            // Remove fragment identifier for now
            const [path, fragment] = href.split('#');
            item.href = this.resolveNavigationPath(navPath, path);
            item.fragment = fragment || null;
          }
        } else {
          // Sometimes there's just a span with text
          const span = li.querySelector('span');
          if (span) {
            item.title = span.textContent.trim();
          }
        }
  
        // Check for nested list (sub-items)
        const nestedList = li.querySelector('ol, ul');
        if (nestedList) {
          item.children = this.parseNavList(nestedList, navPath);
        }
  
        if (item.title) {
          items.push(item);
        }
      }
  
      return items;
    }
  
    async parseEPUB2Navigation(ncxItem) {
      const ncxContent = await this.zipHandler.getTextFile(ncxItem.href);
      const parser = new DOMParser();
      const doc = parser.parseFromString(ncxContent, 'text/xml');
  
      // Check for parse errors
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        console.error('Failed to parse NCX');
        return [];
      }
  
      // Get all navPoints (they can be nested)
      const navMap = doc.querySelector('navMap');
      if (!navMap) return [];
  
      return this.parseNavPoints(navMap, ncxItem.href);
    }
  
    parseNavPoints(parentElement, ncxPath) {
      const items = [];
      const navPoints = parentElement.querySelectorAll(':scope > navPoint');
  
      navPoints.forEach(navPoint => {
        const item = {};
  
        // Get the label
        const navLabel = navPoint.querySelector('navLabel > text');
        if (navLabel) {
          item.title = navLabel.textContent.trim();
        }
  
        // Get the content source
        const content = navPoint.querySelector('content');
        if (content) {
          const src = content.getAttribute('src');
          if (src) {
            const [path, fragment] = src.split('#');
            item.href = this.resolveNavigationPath(ncxPath, path);
            item.fragment = fragment || null;
          }
        }
  
        // Get play order (useful for sorting)
        const playOrder = navPoint.getAttribute('playOrder');
        if (playOrder) {
          item.order = parseInt(playOrder);
        }
  
        // Check for nested navPoints
        const nestedNavPoints = navPoint.querySelectorAll(':scope > navPoint');
        if (nestedNavPoints.length > 0) {
          item.children = this.parseNavPoints(navPoint, ncxPath);
        }
  
        if (item.title) {
          items.push(item);
        }
      });
  
      return items;
    }
  
    resolveNavigationPath(navDocPath, relativePath) {
      if (!relativePath || relativePath === '') {
        return navDocPath;
      }
  
      // Get directory of navigation document
      const navDir = navDocPath.substring(0, navDocPath.lastIndexOf('/'));
      
      // Handle different types of relative paths
      if (relativePath.startsWith('../')) {
        // Go up one directory
        const parentDir = navDir.substring(0, navDir.lastIndexOf('/'));
        const cleanPath = relativePath.replace('../', '');
        return parentDir ? `${parentDir}/${cleanPath}` : cleanPath;
      } else if (relativePath.startsWith('/')) {
        // Absolute path from EPUB root
        return relativePath.substring(1);
      } else {
        // Relative to navigation document directory
        return navDir ? `${navDir}/${relativePath}` : relativePath;
      }
    }
  
    generateFallbackNavigation() {
      // If no navigation found, create a basic one from spine
      console.log('Generating fallback navigation from spine');
      
      const nav = [];
      let chapterNum = 1;
  
      // This assumes spine is available from the parent parser
      // We'll pass it in when needed
      return nav;
    }
  
    // Helper method to find which spine item matches a navigation href
    findSpineIndex(href, spine) {
      if (!href) return -1;
      
      // Remove fragment
      const cleanHref = href.split('#')[0];
      
      return spine.findIndex(item => {
        const itemHref = item.href.split('#')[0];
        return itemHref === cleanHref;
      });
    }
  }