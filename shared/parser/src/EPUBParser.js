// shared/epub-parser/EPUBParser.js
import { ZipHandler } from './ZipHandler.js';
import { ContainerParser } from './ContainerParser.js';
import { OPFParser } from './OPFParser.js';

export class EPUBParser {
  constructor() {
    this.zipHandler = null;
    this.metadata = null;
    this.manifest = null;
    this.spine = null;
    this.navigation = null;
  }

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
    
    console.log('✓ EPUB parsing complete!');
    
    return {
      metadata,
      manifest,
      spine,
      getChapter: (index) => this.getChapter(index)
    };
  }

  async getChapter(index) {
    if (!this.spine || index >= this.spine.length) {
      throw new Error(`Invalid chapter index: ${index}`);
    }
    
    const spineItem = this.spine[index];
    const content = await this.zipHandler.getTextFile(spineItem.href);
    
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
      styles: this.extractStyles(doc)
    };
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