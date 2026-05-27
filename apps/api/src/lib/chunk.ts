/**
 * Simple text chunker for RAG ingest. Splits on paragraph boundaries, then
 * packs into target chunk sizes with light overlap. Good enough for a hackathon.
 */

export interface ChunkOptions {
  targetChars?: number;
  overlapChars?: number;
}

export function chunkText(text: string, opts: ChunkOptions = {}): string[] {
  const targetChars = opts.targetChars ?? 900;
  const overlapChars = opts.overlapChars ?? 120;

  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (normalized.length === 0) return [];
  if (normalized.length <= targetChars) return [normalized];

  const paragraphs = normalized.split(/\n\n+/);
  const chunks: string[] = [];
  let buffer = "";

  for (const para of paragraphs) {
    if ((buffer + "\n\n" + para).length > targetChars && buffer.length > 0) {
      chunks.push(buffer.trim());
      // Carry overlap from end of last buffer
      const tail = buffer.slice(Math.max(0, buffer.length - overlapChars));
      buffer = `${tail}\n\n${para}`;
    } else {
      buffer = buffer.length === 0 ? para : `${buffer}\n\n${para}`;
    }
  }
  if (buffer.trim().length > 0) chunks.push(buffer.trim());

  // If a single paragraph is huge, hard-split it
  const final: string[] = [];
  for (const c of chunks) {
    if (c.length <= targetChars * 1.5) {
      final.push(c);
      continue;
    }
    for (let i = 0; i < c.length; i += targetChars - overlapChars) {
      final.push(c.slice(i, i + targetChars));
    }
  }
  return final;
}
