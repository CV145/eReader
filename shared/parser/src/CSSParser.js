/*

*/
export class CSSParser {
    constructor(zipHandler, manifest) {
      this.zipHandler = zipHandler;
      this.manifest = manifest;
      this.cssCache = new Map();
    }
  
    // Finds all CSS files in the EPUB manifest and loads them
    async getAllCSS() {
      const cssItems = Object.values(this.manifest).filter(
        item => item.mediaType === 'text/css'
      );
  
      const cssContents = [];
      
      for (const item of cssItems) {
        try {
          const css = await this.zipHandler.getTextFile(item.href);
          cssContents.push({
            href: item.href,
            content: css
          });
          this.cssCache.set(item.href, css);
        } catch (error) {
          console.warn(`Failed to load CSS: ${item.href}`, error);
        }
      }
  
      console.log(`✓ Found ${cssContents.length} CSS files`);
      return cssContents;
    }
  
    // Extracts CSS specific to a chapter. Gets inline <style> elements, linked stylesheets, resolves relative paths and caches results
    async getChapterCSS(chapterContent, chapterPath) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(chapterContent, 'text/html');
      
      const cssContents = [];
      
      // Get inline styles 
      const styleElements = doc.querySelectorAll('style');
      styleElements.forEach(style => {
        cssContents.push({
          type: 'inline',
          content: style.textContent
        });
      });
  
      // Get linked stylesheets 
      const linkElements = doc.querySelectorAll('link[rel="stylesheet"]');
      for (const link of linkElements) {
        const href = link.getAttribute('href');
        if (href) {
          const cssPath = this.resolvePath(chapterPath, href);
          
          // Check cache first - CSS file may be in the cache
          if (this.cssCache.has(cssPath)) {
            cssContents.push({
              type: 'external',
              href: cssPath,
              content: this.cssCache.get(cssPath)
            });
          } else {
            // Load from zip
            try {
              const css = await this.zipHandler.getTextFile(cssPath);
              cssContents.push({
                type: 'external',
                href: cssPath,
                content: css
              });
              this.cssCache.set(cssPath, css);
            } catch (error) {
              console.warn(`Failed to load stylesheet: ${cssPath}`, error);
            }
          }
        }
      }
  
      return cssContents;
    }
  
    //Handles different path types
    resolvePath(basePath, relativePath) {
      const baseDir = basePath.substring(0, basePath.lastIndexOf('/'));
      
      if (relativePath.startsWith('../')) {
        // Go up one directory
        const parentDir = baseDir.substring(0, baseDir.lastIndexOf('/'));
        return relativePath.replace('../', parentDir ? parentDir + '/' : '');
      } else if (relativePath.startsWith('/')) {
        // Absolute from EPUB root
        return relativePath.substring(1);
      } else {
        // Relative to current directory
        return baseDir ? `${baseDir}/${relativePath}` : relativePath;
      }
    }
  
    // Process CSS to handle EPUB-specific issues
    /*
 Fixes
  relative URLs in CSS
  (like url('../fonts/f
  ont.woff')) by
  converting them to
  absolute paths within
   the EPUB
    */
    processCSS(css, chapterPath) {
      // Fix relative URLs in CSS (for fonts, images, etc.)
      const baseDir = chapterPath.substring(0, chapterPath.lastIndexOf('/'));
      
      // This regex finds url() declarations
      const urlRegex = /url\(['"]?([^'")]+)['"]?\)/g;
      
      return css.replace(urlRegex, (match, url) => {
        if (url.startsWith('data:') || url.startsWith('http')) {
          return match; // Leave data URLs and absolute URLs alone
        }
        
        // Resolve relative URL
        const resolvedUrl = this.resolvePath(chapterPath, url);
        return `url('${resolvedUrl}')`;
      });
    }
  }