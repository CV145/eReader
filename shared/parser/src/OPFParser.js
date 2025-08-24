/*
The OPFParser handles the OPF file (Open Packaging Format) - the most important file in an EPUB
that describes the entire book structure. It is an XML file that's like the "index" of the EPUB

The OPF extracts metadata like book title, author name, language, and identifier. It also extracts
the manifest which contains all files in the book and the spine (reading order)
*/
export class OPFParser {
    constructor(zipHandler, opfPath) {
      this.zipHandler = zipHandler;
      this.opfPath = opfPath;
      this.opfDir = opfPath.substring(0, opfPath.lastIndexOf('/')) || '';
    }
  
    async parse() {
      const opfContent = await this.zipHandler.getTextFile(this.opfPath);
      
      // Create a DOM parser
      const parser = new DOMParser();
      const doc = parser.parseFromString(opfContent, 'text/xml');
      
      // Check for parse errors
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        throw new Error('Failed to parse OPF XML');
      }
      
      // Extract metadata
      const metadata = this.extractMetadata(doc);
      
      // Extract manifest (all files in the book)
      const manifest = this.extractManifest(doc);
      
      // Extract spine (reading order)
      const spine = this.extractSpine(doc, manifest);
      
      return {
        metadata,
        manifest,
        spine
      };
    }
  
    extractMetadata(doc) {
      // Try different namespace possibilities
      const getElementText = (tagName) => {
        // Try without namespace
        let elem = doc.querySelector(`metadata > ${tagName}`);
        if (elem) return elem.textContent;
        
        // Try with dc: namespace
        elem = doc.querySelector(`metadata > dc\\:${tagName}, metadata > ${tagName}`);
        if (elem) return elem.textContent;
        
        return null;
      };
      
      return {
        title: getElementText('title') || 'Unknown Title',
        creator: getElementText('creator') || 'Unknown Author',
        language: getElementText('language') || 'en',
        publisher: getElementText('publisher'),
        date: getElementText('date'),
        description: getElementText('description'),
        rights: getElementText('rights')
      };
    }
  
    extractManifest(doc) {
      const manifest = {};
      const items = doc.querySelectorAll('manifest > item');
      
      items.forEach(item => {
        const id = item.getAttribute('id');
        const href = item.getAttribute('href');
        const mediaType = item.getAttribute('media-type');
        
        // Resolve the full path relative to OPF location
        const fullPath = this.resolvePath(href);
        
        manifest[id] = {
          id,
          href: fullPath,
          mediaType,
          isNav: item.getAttribute('properties')?.includes('nav'),
          isCover: item.getAttribute('properties')?.includes('cover-image')
        };
      });
      
      console.log(`✓ Found ${Object.keys(manifest).length} manifest items`);
      return manifest;
    }
  
    extractSpine(doc, manifest) {
      const spine = [];
      const itemrefs = doc.querySelectorAll('spine > itemref');
      
      itemrefs.forEach(itemref => {
        const idref = itemref.getAttribute('idref');
        const linear = itemref.getAttribute('linear') !== 'no';
        
        if (manifest[idref]) {
          spine.push({
            ...manifest[idref],
            linear,
            order: spine.length
          });
        }
      });
      
      console.log(`✓ Found ${spine.length} spine items (chapters)`);
      return spine;
    }
  
    resolvePath(href) {
      if (!this.opfDir) return href;
      return `${this.opfDir}/${href}`;
    }
  }