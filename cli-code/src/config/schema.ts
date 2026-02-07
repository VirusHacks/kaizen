export interface LLMConfig {
  provider: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  retries: number;
}

export interface FilesConfig {
  maxFileSize: number;
  maxLinesPerChunk: number;
  chunkOverlap: number;
  ignoredPatterns: string[];
  includedExtensions: string[];
}

export interface ReviewConfig {
  defaultMode: 'staged' | 'unstaged' | 'branch';
  baseBranch: string;
  outputFile: string;
  concurrency: number;
}

export interface ProjectConfig {
  name: string;
  environment: string;
}

export interface AppConfig {
  llm: LLMConfig;
  files: FilesConfig;
  review: ReviewConfig;
  project: ProjectConfig;
}

export const DEFAULT_CONFIG: AppConfig = {
  llm: {
    provider: 'gemini',
    apiKey: '',
    model: 'gemini-2.5-flash',
    maxTokens: 8192,
    temperature: 0.2,
    timeout: 120000,
    retries: 3,
  },
  files: {
    maxFileSize: 100000,
    maxLinesPerChunk: 500,
    chunkOverlap: 50,
    ignoredPatterns: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.git/**',
      '*.min.js',
      '*.min.css',
      '*.map',
      '*.lock',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      '*.png',
      '*.jpg',
      '*.jpeg',
      '*.gif',
      '*.svg',
      '*.ico',
      '*.woff',
      '*.woff2',
      '*.ttf',
      '*.eot',
      '*.mp3',
      '*.mp4',
      '*.pdf',
      '*.zip',
      '*.tar.gz',
      '*.exe',
      '*.dll',
      '*.so',
      '*.dylib',
    ],
    includedExtensions: [
      '.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java',
      '.c', '.cpp', '.h', '.hpp', '.cs', '.rb', '.php', '.swift',
      '.kt', '.scala', '.vue', '.svelte', '.html', '.css', '.scss',
      '.less', '.sql', '.sh', '.bash', '.zsh', '.yaml', '.yml',
      '.json', '.toml', '.xml', '.md', '.graphql', '.proto',
    ],
  },
  review: {
    defaultMode: 'staged',
    baseBranch: 'main',
    outputFile: 'code-review-{date}.md',
    concurrency: 3,
  },
  project: {
    name: '',
    environment: 'development',
  },
};
