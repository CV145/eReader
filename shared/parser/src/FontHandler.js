/*
1. Scans the EPUB manifest for font files
2. Extracts fonts as binary data
3. Converts to data URLs or blob URLs
4. Updates CSS @font-face rules to use these rules
5. Caches everything for performance
*/
export class FontHandler {
    constructor(zipHandler, manifest) {
      this.zipHandler = zipHandler;
      this.manifest = manifest;
      this.fontCache = new Map();
    }
  
    // Finds all font files in the manifest (TTF, OTF, WOFF, etc). Extracts them as base64 data. Creates data URLs for embeding in CSS. Caches fonts for reuse
    async extractFonts() {
      const fonts = [];
      
      // Find all font files in manifest
      const fontItems = Object.values(this.manifest).filter(item => {
        const mediaType = item.mediaType.toLowerCase();
        return mediaType.includes('font') || 
               mediaType.includes('otf') || 
               mediaType.includes('ttf') || 
               mediaType.includes('woff');
      });
  
      console.log(`Found ${fontItems.length} font files in EPUB`);
  
      for (const item of fontItems) {
        try {
          // Get font as base64
          const fontData = await this.zipHandler.getBinaryFile(item.href);
          
          if (fontData) {
            // Determine the correct MIME type
            const mimeType = this.getFontMimeType(item.mediaType, item.href);
            
            // Create data URL
            const dataUrl = `data:${mimeType};base64,${fontData}`;
            
            fonts.push({
              id: item.id,
              href: item.href,
              mimeType: mimeType,
              dataUrl: dataUrl,
              fileName: item.href.split('/').pop()
            });
            
            // Cache for quick access
            this.fontCache.set(item.href, dataUrl);
            
            console.log(`✓ Extracted font: ${item.href}`);
          }
        } catch (error) {
          console.warn(`Failed to extract font: ${item.href}`, error);
        }
      }
  
      return fonts;
    }
  
    // Determines the correct MIME type for fonts. Falls back to file extension detection if manifest type is generic. Maps extensions: .ttf -> font/ttf
    getFontMimeType(mediaType, href) {
      // Sometimes the media-type is generic, so we check the file extension
      if (mediaType && mediaType !== 'application/octet-stream') {
        return mediaType;
      }
  
      // Determine from file extension
      const ext = href.split('.').pop().toLowerCase();
      const mimeTypes = {
        'ttf': 'font/ttf',
        'otf': 'font/otf',
        'woff': 'font/woff',
        'woff2': 'font/woff2',
        'eot': 'application/vnd.ms-fontobject',
        'svg': 'image/svg+xml'
      };
  
      return mimeTypes[ext] || 'font/opentype';
    }
  
    // Finds @font-face declarations in CSS. Replaces font URLs with data URLs. Handles relative path resolution. Updates CSS so fonts load properly
    processCSSWithFonts(css, basePath) {
      let processedCSS = css;
  
      // Find all @font-face declarations
      const fontFaceRegex = /@font-face\s*{[^}]+}/g;
      const fontFaces = css.match(fontFaceRegex) || [];
  
      fontFaces.forEach(fontFace => {
        // Find url() in this @font-face
        const urlRegex = /url\(['"]?([^'")]+)['"]?\)/g;
        let processedFontFace = fontFace;
        
        let match;
        while ((match = urlRegex.exec(fontFace)) !== null) {
          const originalUrl = match[1];
          
          // Skip if already a data URL
          if (originalUrl.startsWith('data:')) continue;
          
          // Resolve the font path
          const fontPath = this.resolvePath(basePath, originalUrl);
          
          // Get cached data URL
          const dataUrl = this.fontCache.get(fontPath);
          
          if (dataUrl) {
            // Replace with data URL
            processedFontFace = processedFontFace.replace(
              match[0],
              `url('${dataUrl}')`
            );
          }
        }
        
        processedCSS = processedCSS.replace(fontFace, processedFontFace);
      });
  
      return processedCSS;
    }
  
    resolvePath(basePath, relativePath) {
      const baseDir = basePath.substring(0, basePath.lastIndexOf('/'));
      
      if (relativePath.startsWith('../')) {
        const parentDir = baseDir.substring(0, baseDir.lastIndexOf('/'));
        return relativePath.replace('../', parentDir ? parentDir + '/' : '');
      } else if (relativePath.startsWith('/')) {
        return relativePath.substring(1);
      } else if (relativePath.startsWith('./')) {
        const cleanPath = relativePath.replace('./', '');
        return baseDir ? `${baseDir}/${cleanPath}` : cleanPath;
      } else {
        return baseDir ? `${baseDir}/${relativePath}` : relativePath;
      }
    }
  
    // Alternative: Create blob URLs instead of data URLs (better for large fonts)
    async createBlobUrls() {
      const fonts = [];
      
      const fontItems = Object.values(this.manifest).filter(item => 
        item.mediaType.includes('font') || 
        item.href.match(/\.(ttf|otf|woff|woff2)$/i)
      );
  
      for (const item of fontItems) {
        try {
          const fontData = await this.zipHandler.getBinaryFile(item.href);
          
          if (fontData) {
            // Convert base64 to blob
            const byteCharacters = atob(fontData);
            const byteNumbers = new Array(byteCharacters.length);
            
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { 
              type: this.getFontMimeType(item.mediaType, item.href) 
            });
            
            // Create blob URL
            const blobUrl = URL.createObjectURL(blob);
            
            fonts.push({
              href: item.href,
              blobUrl: blobUrl,
              revoke: () => URL.revokeObjectURL(blobUrl) // Cleanup function
            });
            
            this.fontCache.set(item.href, blobUrl);
          }
        } catch (error) {
          console.warn(`Failed to create blob URL for font: ${item.href}`, error);
        }
      }
  
      return fonts;
    }
  }