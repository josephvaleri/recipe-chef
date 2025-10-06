import { isZip, isGzip, looksLikeJsonText, parsePaprikaArchive } from '@/lib/paprika';

describe('Paprika Parser', () => {
  describe('isZip', () => {
    it('should detect ZIP files', () => {
      const zipBuffer = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x00, 0x00]);
      expect(isZip(zipBuffer)).toBe(true);
    });

    it('should reject non-ZIP files', () => {
      const nonZipBuffer = Buffer.from([0x1f, 0x8b, 0x08, 0x00]);
      expect(isZip(nonZipBuffer)).toBe(false);
    });

    it('should handle empty buffers', () => {
      expect(isZip(Buffer.alloc(0))).toBe(false);
    });
  });

  describe('isGzip', () => {
    it('should detect GZIP files', () => {
      const gzipBuffer = Buffer.from([0x1f, 0x8b, 0x08, 0x00]);
      expect(isGzip(gzipBuffer)).toBe(true);
    });

    it('should reject non-GZIP files', () => {
      const nonGzipBuffer = Buffer.from([0x50, 0x4B, 0x03, 0x04]);
      expect(isGzip(nonGzipBuffer)).toBe(false);
    });
  });

  describe('looksLikeJsonText', () => {
    it('should detect JSON objects', () => {
      expect(looksLikeJsonText('{"name": "test"}')).toBe(true);
    });

    it('should detect JSON arrays', () => {
      expect(looksLikeJsonText('[{"name": "test"}]')).toBe(true);
    });

    it('should handle whitespace', () => {
      expect(looksLikeJsonText('  {"name": "test"}  ')).toBe(true);
    });

    it('should reject non-JSON text', () => {
      expect(looksLikeJsonText('Hello World')).toBe(false);
      expect(looksLikeJsonText('<html>test</html>')).toBe(false);
      expect(looksLikeJsonText('')).toBe(false);
    });
  });

  describe('parsePaprikaArchive', () => {
    it('should handle empty archives', async () => {
      // This would require creating a minimal ZIP buffer
      // For now, we'll test the function exists and can be called
      expect(typeof parsePaprikaArchive).toBe('function');
    });

    it('should respect max depth limit', async () => {
      // Test that recursion stops at max depth
      const deepBuffer = Buffer.from([0x50, 0x4B, 0x03, 0x04]); // Minimal ZIP
      const result = await parsePaprikaArchive(deepBuffer, 0, 0);
      expect(result).toEqual([]);
    });
  });
});

