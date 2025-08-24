//EPUBs are zip files, so we need to unzip them first. That's what the ZipHandler does

import JSZip from 'https://cdn.skypack.dev/jszip@3.10.1';

export class ZipHandler {
  constructor() {
    this.zip = null;
    this.files = {};
  }

  async loadFromBuffer(buffer) {
    this.zip = await JSZip.loadAsync(buffer);
    
    // First check: Is this a valid EPUB?
    const mimetypeFile = this.zip.file('mimetype');
    if (!mimetypeFile) {
      throw new Error('No mimetype file found - not a valid EPUB');
    }
    
    const mimetype = await mimetypeFile.async('string');
    if (mimetype.trim() !== 'application/epub+zip') {
      throw new Error(`Invalid mimetype: ${mimetype}`);
    }
    
    console.log('✓ Valid EPUB file detected');
    return true;
  }

  async getTextFile(path) {
    const file = this.zip.file(path);
    if (!file) {
      throw new Error(`File not found in EPUB: ${path}`);
    }
    return await file.async('string');
  }

  async getBinaryFile(path) {
    const file = this.zip.file(path);
    if (!file) return null;
    return await file.async('base64');
  }

  listFiles() {
    const files = [];
    this.zip.forEach((relativePath, file) => {
      files.push({
        path: relativePath,
        dir: file.dir
      });
    });
    return files;
  }
}