import * as yauzl from "yauzl";
import { gunzipSync } from "node:zlib";
import { Readable } from "node:stream";
import { normalizePaprika } from "./normalizers";
import type { NormalizedRecipe } from "./types";

/**
 * Check if buffer starts with ZIP magic bytes
 */
export function isZip(buf: Buffer): boolean {
  return buf.length >= 4 && 
         buf[0] === 0x50 && buf[1] === 0x4B && 
         buf[2] === 0x03 && buf[3] === 0x04;
}

/**
 * Check if buffer starts with GZIP magic bytes
 */
export function isGzip(buf: Buffer): boolean {
  return buf.length >= 2 && 
         buf[0] === 0x1f && buf[1] === 0x8b;
}

/**
 * Check if string looks like JSON (starts with { or [)
 */
export function looksLikeJsonText(s: string): boolean {
  const trimmed = s.trim();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
}

/**
 * Recursively parse any ZIP buffer that may contain:
 * - JSON / gzipped JSON
 * - images (ignored except base64 inside JSON)
 * - nested .paprikarecipe (ZIP) files
 */
export async function parsePaprikaArchive(buffer: Buffer, depth = 0, maxDepth = 3): Promise<NormalizedRecipe[]> {
  if (depth > maxDepth) {
    console.warn(`Max recursion depth ${maxDepth} reached, skipping nested archive`);
    return [];
  }

  const out: NormalizedRecipe[] = [];
  
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        console.error('Failed to open archive:', err);
        resolve(out);
        return;
      }

      if (!zipfile) {
        resolve(out);
        return;
      }

      let processedCount = 0;
      const totalEntries = zipfile.entryCount;

      zipfile.readEntry();

      zipfile.on('entry', (entry) => {
        if (/\/$/.test(entry.fileName)) {
          // Directory entry, skip
          zipfile.readEntry();
          return;
        }

        zipfile.openReadStream(entry, (err, readStream) => {
          if (err) {
            console.warn(`Failed to read entry ${entry.fileName}:`, err);
            zipfile.readEntry();
            return;
          }

          if (!readStream) {
            zipfile.readEntry();
            return;
          }

          const chunks: Buffer[] = [];
          readStream.on('data', (chunk) => {
            chunks.push(chunk);
          });

          readStream.on('end', async () => {
            try {
              const raw = Buffer.concat(chunks);

              // If this entry itself looks like a ZIP (nested .paprikarecipe), recurse
              if (isZip(raw)) {
                console.log(`Found nested ZIP at depth ${depth + 1}, recursing...`);
                const nested = await parsePaprikaArchive(raw, depth + 1, maxDepth);
                out.push(...nested);
              } else {
                // Otherwise, try gz → json text
                const data = isGzip(raw) ? gunzipSync(raw) : raw;
                const text = data.toString("utf8").trim();
                
                if (looksLikeJsonText(text)) {
                  try {
                    const obj = JSON.parse(text);
                    if (Array.isArray(obj)) {
                      obj.forEach(o => {
                        try {
                          out.push(normalizePaprika(o));
                        } catch (normalizeError) {
                          console.warn('Failed to normalize recipe:', normalizeError);
                        }
                      });
                    } else {
                      out.push(normalizePaprika(obj));
                    }
                  } catch (parseError) {
                    console.warn('Failed to parse JSON:', parseError);
                  }
                }
              }
            } catch (fileError) {
              console.warn(`Failed to process file ${entry.fileName}:`, fileError);
            }

            processedCount++;
            if (processedCount >= totalEntries) {
              resolve(out);
            } else {
              zipfile.readEntry();
            }
          });

          readStream.on('error', (err) => {
            console.warn(`Stream error for ${entry.fileName}:`, err);
            processedCount++;
            if (processedCount >= totalEntries) {
              resolve(out);
            } else {
              zipfile.readEntry();
            }
          });
        });
      });

      zipfile.on('end', () => {
        resolve(out);
      });

      zipfile.on('error', (err) => {
        console.error('ZIP file error:', err);
        resolve(out);
      });
    });
  });
}

/**
 * Streaming entry point (from a Web/Node stream)
 */
export async function parsePaprikaFromStream(stream: Readable): Promise<NormalizedRecipe[]> {
  // We must buffer the top-level file once to inspect signatures and recurse nested ZIPs.
  // For big files, consider chunking with temp files; for now, buffer safely with limits.
  const chunks: Buffer[] = [];
  for await (const c of stream) {
    chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  }
  const buffer = Buffer.concat(chunks);

  if (isZip(buffer)) {
    return parsePaprikaArchive(buffer);
  }

  // Non-zip top-level: maybe single gzipped JSON or JSON (rare, but handle it)
  const maybe = isGzip(buffer) ? gunzipSync(buffer) : buffer;
  const text = maybe.toString("utf8").trim();
  
  if (looksLikeJsonText(text)) {
    try {
      const obj = JSON.parse(text);
      return Array.isArray(obj) ? obj.map(normalizePaprika) : [normalizePaprika(obj)];
    } catch (parseError) {
      console.error('Failed to parse JSON from stream:', parseError);
      return [];
    }
  }

  return [];
}
