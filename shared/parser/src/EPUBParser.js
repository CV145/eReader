// shared/epub-parser/EPUBParser.js
import { ZipHandler } from './ZipHandler.js';
import { ContainerParser } from './ContainerParser.js';
import { OPFParser } from './OPFParser.js';
import { NavigationParser } from './NavigationParser.js';
import { CSSParser } from './CSSParser.js';
import { FontHandler } from './FontHandler.js';

export class EPUBParser {
  constructor() {
    this.zipHandler = null;
    this.metadata = null;
    this.manifest = null;
    this.spine = null;
    this.navigation = null;
    this.CSSParser = null;
    this.fontHandler = null;
    this.fonts = [];
  }

  // Parses the epub and returns metadata, manifest (list of files), spine, navigation array, a getChapter function that takes an index and calls getChapter(index), and a getChapterByHref(href) function
  async parse(buffer) {
    console.log('Starting EPUB parse...');
    
    // Step 1: Open the ZIP
    this.zipHandler = new ZipHandler();
    await this.zipHandler.loadFromBuffer(buffer);
    
    // Step 2: Find the OPF file
    const containerParser = new ContainerParser(this.zipHandler);
    const { opfPath } = await containerParser.parse();
    
    // Step 3: Parse the OPF
    const opfParser = new OPFParser(this.zipHandler, opfPath);
    const { metadata, manifest, spine } = await opfParser.parse();
    
    this.metadata = metadata;
    this.manifest = manifest;
    this.spine = spine;

    // Step 4: Parse navigation
    const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/'));
    const navParser = new NavigationParser(this.zipHandler, manifest, opfDir); //Instantiate a new navParser
    this.navigation = await navParser.parse(); // parse() returns an array of navigation objects with structure. This array may differ between EPUB2 and EPUB3

    // Step 5: Parse CSS
    this.cssParser = new CSSParser(this.zipHandler, this.manifest);
    
    // Pre-load all CSS files (for performance)
    const globalCSS = await this.cssParser.getAllCSS();

    // Step 6: Extract fonts
    this.fontHandler = new FontHandler(this.zipHandler, this.manifest);
    this.fonts = await this.fontHandler.extractFonts();
    
    console.log('✓ EPUB parsing complete!');
    
    return {
      metadata,
      manifest,
      spine,
      navigation: this.navigation,
      globalCSS,
      fonts: this.fonts,
      getChapter: (index) => this.getChapter(index),
      getChapterByHref: (href) => this.getChapterByHref(href)
    };
  }

  async getChapter(index) {
    if (!this.spine || index >= this.spine.length) {
      throw new Error(`Invalid chapter index: ${index}`);
    }
    
    const spineItem = this.spine[index];
    const content = await this.zipHandler.getTextFile(spineItem.href);

    // Get ALL CSS for this chapter
    const chapterCSS = await this.cssParser.getChapterCSS(content, spineItem.href);

    // Process CSS to include font data URLs
    const processedCSS = chapterCSS.map(cssItem => ({
      ...cssItem,
      content: this.fontHandler.processCSSWithFonts(
        cssItem.content,
        cssItem.href || spineItem.href
      )
    }));
    
    // Parse the XHTML content
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    
    // Extract just the body content
    const body = doc.body;
    
    // Process images to data URLs
    const images = body.querySelectorAll('img');
    for (const img of images) {
      const src = img.getAttribute('src');
      if (src && !src.startsWith('http')) {
        // Resolve path relative to chapter
        const imagePath = this.resolveResourcePath(spineItem.href, src);
        const imageData = await this.zipHandler.getBinaryFile(imagePath);
        
        if (imageData) {
          // Find mime type from manifest
          const imageManifestItem = Object.values(this.manifest)
            .find(item => item.href === imagePath);
          const mimeType = imageManifestItem?.mediaType || 'image/jpeg';
          
          img.src = `data:${mimeType};base64,${imageData}`;
        }
      }
    }
    
    return {
      title: doc.title || `Chapter ${index + 1}`,
      content: body.innerHTML,
      css: processedCSS, //Return all CSS
      // Combine all CSS into one string for easy use
      /*
     The frontend can inject the CSS like this:
      <style>
       {chapter.combinedCSS}
       </style>
      */
      combinedCSS: processedCSS.map(item => item.content).join('\n')
      //styles: this.extractStyles(doc)
    };
  }

  async getChapterByHref(href) {
    // Remove fragment if present
    const cleanHref = href.split('#')[0];
    
    // Find in spine
    const spineIndex = this.spine.findIndex(item => 
      item.href.split('#')[0] === cleanHref
    );
    
    if (spineIndex === -1) {
      throw new Error(`Chapter not found: ${href}`);
    }
    
    return this.getChapter(spineIndex);
  }

  resolveResourcePath(chapterPath, resourcePath) {
    const chapterDir = chapterPath.substring(0, chapterPath.lastIndexOf('/'));
    if (!chapterDir) return resourcePath;
    
    // Handle relative paths
    if (resourcePath.startsWith('../')) {
      // This is more complex - implement if needed
      return resourcePath.replace('../', '');
    }
    
    return `${chapterDir}/${resourcePath}`;
  }

  extractStyles(doc) {
    const styles = [];
    const styleElements = doc.querySelectorAll('style');
    styleElements.forEach(style => {
      styles.push(style.textContent);
    });
    return styles.join('\n');
  }
}