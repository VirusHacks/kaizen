export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  content: string;
  changes: DiffChange[];
}

export interface DiffChange {
  type: 'add' | 'delete' | 'context';
  lineNumber: number;
  content: string;
}

export interface ParsedDiff {
  oldFile: string;
  newFile: string;
  hunks: DiffHunk[];
  isBinary: boolean;
  isNew: boolean;
  isDeleted: boolean;
  isRenamed: boolean;
}

export function parseDiffOutput(diffText: string): ParsedDiff[] {
  const diffs: ParsedDiff[] = [];
  if (!diffText.trim()) return diffs;

  const fileSections = diffText.split(/^diff --git /m).filter((s) => s.trim());

  for (const section of fileSections) {
    const diff = parseFileDiff(section);
    if (diff) {
      diffs.push(diff);
    }
  }

  return diffs;
}

function parseFileDiff(section: string): ParsedDiff | null {
  const lines = section.split('\n');
  if (lines.length === 0) return null;

  // Parse file names from first line: a/file b/file
  const headerMatch = lines[0].match(/a\/(.+?)\s+b\/(.+)/);
  const oldFile = headerMatch ? headerMatch[1] : '';
  const newFile = headerMatch ? headerMatch[2] : '';

  const isBinary = section.includes('Binary files');
  const isNew = section.includes('new file mode');
  const isDeleted = section.includes('deleted file mode');
  const isRenamed = section.includes('rename from') || section.includes('similarity index');

  if (isBinary) {
    return { oldFile, newFile, hunks: [], isBinary, isNew, isDeleted, isRenamed };
  }

  const hunks: DiffHunk[] = [];
  let currentHunk: DiffHunk | null = null;
  let newLineNum = 0;

  for (const line of lines) {
    const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)/);
    if (hunkMatch) {
      if (currentHunk) hunks.push(currentHunk);
      const oldStart = parseInt(hunkMatch[1], 10);
      const oldLines = parseInt(hunkMatch[2] || '1', 10);
      const newStart = parseInt(hunkMatch[3], 10);
      const newLines = parseInt(hunkMatch[4] || '1', 10);
      newLineNum = newStart;

      currentHunk = {
        oldStart,
        oldLines,
        newStart,
        newLines,
        content: hunkMatch[5] || '',
        changes: [],
      };
      continue;
    }

    if (!currentHunk) continue;

    if (line.startsWith('+') && !line.startsWith('+++')) {
      currentHunk.changes.push({
        type: 'add',
        lineNumber: newLineNum,
        content: line.substring(1),
      });
      newLineNum++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      currentHunk.changes.push({
        type: 'delete',
        lineNumber: newLineNum,
        content: line.substring(1),
      });
    } else if (line.startsWith(' ')) {
      currentHunk.changes.push({
        type: 'context',
        lineNumber: newLineNum,
        content: line.substring(1),
      });
      newLineNum++;
    }
  }

  if (currentHunk) hunks.push(currentHunk);

  return { oldFile, newFile, hunks, isBinary, isNew, isDeleted, isRenamed };
}
