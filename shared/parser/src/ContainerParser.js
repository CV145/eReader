/*Looks for the OPF file

It handles the container.xml file, the "entry point" of every EPUB that tells where to find the main
OPF file. The container.xml is always located at META-INF/container.xml in the EPUB zip

Example container.xml:
  <?xml version="1.0"?>
  <container version="1.0" xmlns="urn:oasis:
  names:tc:opendocument:xmlns:container">
    <rootfiles>
      <rootfile 
  full-path="OEBPS/content.opf" media-type="
  application/oebps-package+xml"/>
    </rootfiles>
  </container>
*/
export class ContainerParser {
    constructor(zipHandler) {
      this.zipHandler = zipHandler;
    }
  
    // Returns the OPF path so EPUBParser knows which file to parse next
    async parse() {
      // The container.xml tells us where the OPF file is
      const containerXml = await this.zipHandler.getTextFile('META-INF/container.xml');
      
      // Simple regex parsing (we'll improve this later)
      const opfPathMatch = containerXml.match(/full-path="([^"]+)"/);
      
      if (!opfPathMatch) {
        throw new Error('Could not find OPF path in container.xml. Could be the regex parsing needs to be improved.');
      }
      
      //The path tells where the OPF file is located. Could be OEBPS/content.opf, Content/book.opf, or any other path. It varies by publisher
      const opfPath = opfPathMatch[1];
      console.log(`✓ Found OPF file at: ${opfPath}`);
      
      return {
        opfPath,
        opfDir: opfPath.substring(0, opfPath.lastIndexOf('/')) || ''
      };
    }
  }