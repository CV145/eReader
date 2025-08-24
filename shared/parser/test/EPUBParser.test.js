import { describe, it, expect } from 'vitest';
import { EPUBParser } from '../src/EPUBParser.js';

describe('EPUBParser', () => {
  it('should create parser instance', () => {
    const parser = new EPUBParser();
    expect(parser).toBeDefined();
  });

  // Add more tests here as you implement functionality
});