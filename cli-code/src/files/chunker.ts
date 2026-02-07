import { FileContent } from './reader';

export interface FileChunk {
  filePath: string;
  language: string;
  chunkIndex: number;
  totalChunks: number;
  startLine: number;
  endLine: number;
  content: string;
  lineCount: number;
}

export function chunkFile(
  file: FileContent,
  maxLinesPerChunk: number,
  chunkOverlap: number
): FileChunk[] {
  const lines = file.content.split('\n');

  // If file fits in one chunk, return as-is
  if (lines.length <= maxLinesPerChunk) {
    return [
      {
        filePath: file.path,
        language: file.language,
        chunkIndex: 0,
        totalChunks: 1,
        startLine: 1,
        endLine: lines.length,
        content: file.content,
        lineCount: lines.length,
      },
    ];
  }

  const step = maxLinesPerChunk - chunkOverlap;
  const chunks: FileChunk[] = [];
  let startIdx = 0;

  while (startIdx < lines.length) {
    const endIdx = Math.min(startIdx + maxLinesPerChunk, lines.length);
    const chunkLines = lines.slice(startIdx, endIdx);

    chunks.push({
      filePath: file.path,
      language: file.language,
      chunkIndex: chunks.length,
      totalChunks: 0, // Will be set after
      startLine: startIdx + 1,
      endLine: endIdx,
      content: chunkLines.join('\n'),
      lineCount: chunkLines.length,
    });

    startIdx += step;

    // Avoid creating a tiny last chunk
    if (startIdx < lines.length && lines.length - startIdx < chunkOverlap) {
      break;
    }
  }

  // Set total chunks
  for (const chunk of chunks) {
    chunk.totalChunks = chunks.length;
  }

  return chunks;
}

export function chunkFiles(
  files: FileContent[],
  maxLinesPerChunk: number,
  chunkOverlap: number
): FileChunk[] {
  const allChunks: FileChunk[] = [];

  for (const file of files) {
    const chunks = chunkFile(file, maxLinesPerChunk, chunkOverlap);
    allChunks.push(...chunks);
  }

  return allChunks;
}
