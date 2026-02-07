# Code Review CLI

AI-powered code review tool using Claude. Analyzes your git changes and generates comprehensive code review reports and PM-friendly task summaries.

## Quick Start

```bash
# Install dependencies
npm install

# Build
npm run build

# Initialize configuration
code-review init

# Add your API key to .env
echo "ANTHROPIC_API_KEY=sk-ant-your-key-here" > .env

# Review staged changes
code-review review --staged

# Review unstaged changes
code-review review --unstaged

# Review branch changes vs main
code-review review --branch main

# Generate PM task summary
code-review task-md --since "7 days ago"
```

## Installation

```bash
# Clone and build
git clone <repo-url>
cd code-review-cli
npm install
npm run build

# Link globally
npm link

# Verify installation
code-review --version
```

## Commands

### `code-review init`

Creates `.codereviewrc` and `.env` files in the current directory.

### `code-review review`

Reviews code changes using AI.

| Flag | Description |
|------|-------------|
| `--staged` | Review staged changes (default) |
| `--unstaged` | Review unstaged and untracked changes |
| `--branch <name>` | Review changes compared to a branch |
| `--output <file>` | Output file path |
| `--max-files <n>` | Maximum files to review |
| `--concurrency <n>` | Concurrent LLM requests (1-10) |
| `--config <path>` | Path to config file |
| `--verbose` | Enable verbose logging |
| `--quiet` | Suppress all output except errors |

### `code-review task-md`

Generates a PM-friendly task summary from git history.

| Flag | Description |
|------|-------------|
| `--since <date>` | Commits since date (e.g., "2 weeks ago") |
| `--from <hash>` | Commits from hash to HEAD |
| `--between <tag1> <tag2>` | Commits between two refs |
| `--include-review` | Include latest code review summary |
| `--output <file>` | Output file path |
| `--config <path>` | Path to config file |
| `--verbose` | Enable verbose logging |
| `--quiet` | Suppress all output except errors |

## Configuration

Configuration is loaded from (in priority order):
1. CLI flags
2. Environment variables (`ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `ANTHROPIC_MAX_TOKENS`)
3. `.codereviewrc` file (YAML or JSON)
4. Built-in defaults

### `.codereviewrc` Example

```yaml
llm:
  provider: anthropic
  model: claude-sonnet-4-20250514
  maxTokens: 4096
  temperature: 0.2
  timeout: 120000
  retries: 3

files:
  maxFileSize: 100000
  maxLinesPerChunk: 500
  chunkOverlap: 50
  ignoredPatterns:
    - "node_modules/**"
    - "dist/**"
    - "build/**"
  includedExtensions:
    - ".ts"
    - ".js"
    - ".py"
    - ".go"

review:
  defaultMode: staged
  baseBranch: main
  outputFile: "code-review-{date}.md"
  concurrency: 3

project:
  name: "My Project"
  environment: development
```

## Architecture

```
src/
├── index.ts              # CLI entry point (Commander.js)
├── config/               # Configuration management
│   ├── schema.ts         # TypeScript interfaces & defaults
│   ├── loader.ts         # YAML/JSON config loading, env vars
│   └── validator.ts      # Config validation
├── utils/                # Shared utilities
│   ├── logger.ts         # Leveled logging with chalk
│   ├── errors.ts         # Typed error hierarchy
│   ├── retry.ts          # Exponential backoff with jitter
│   └── concurrency.ts    # Concurrent task execution
├── git/                  # Git integration
│   ├── repository.ts     # Git repo detection & commands
│   ├── changes.ts        # Staged/unstaged/branch diff detection
│   ├── history.ts        # Commit history parsing
│   └── diff-parser.ts    # Unified diff parser
├── files/                # File processing
│   ├── reader.ts         # File reading with binary detection
│   ├── filter.ts         # Glob-based file filtering
│   ├── chunker.ts        # Large file chunking with overlap
│   └── language-detector.ts  # Extension-based language detection
├── llm/                  # LLM abstraction
│   ├── provider.ts       # Provider interface & token tracking
│   ├── anthropic.ts      # Anthropic SDK implementation
│   ├── prompt-builder.ts # Template engine ({{var}}, {{#if}}, {{#each}})
│   └── prompts/          # Prompt templates
│       └── templates.ts  # Code review & task-md prompts
├── output/               # Report generation
│   ├── markdown-generator.ts  # Markdown report building
│   └── formatters.ts     # Console output formatting
├── core/                 # Orchestration
│   ├── review-orchestrator.ts  # Review workflow
│   └── task-orchestrator.ts    # Task-MD workflow
└── commands/             # CLI commands
    ├── init.ts           # Initialize config files
    ├── review.ts         # Review command
    └── task-md.ts        # Task summary command
```

### Why Each Module Exists

| Module | Purpose |
|--------|---------|
| **config/** | Separates config concerns from business logic. Supports multiple formats (YAML/JSON) and sources (file, env, defaults). |
| **utils/** | Shared infrastructure. Retry logic and concurrency are reusable across any async operation. |
| **git/** | Encapsulates all git interactions. The repository class abstracts shell commands; changes/history focus on data extraction. |
| **files/** | Handles file I/O complexities: binary detection, size limits, language detection, chunking large files. |
| **llm/** | Provider abstraction enables adding OpenAI/other providers without changing business logic. Template engine avoids prompt string concatenation. |
| **output/** | Separates report formatting from data generation. Easy to add new output formats (JSON, HTML). |
| **core/** | Orchestrators coordinate the full workflow. Each orchestrator is a single async function that ties all modules together. |
| **commands/** | Thin CLI layer that parses flags and delegates to orchestrators. |

## Key Design Decisions

### Concurrency Model
Files are reviewed concurrently with a configurable limit (default: 3). This balances throughput against API rate limits. The `runWithConcurrencySettled` utility continues processing even when individual files fail.

### Chunking Strategy
Files over 500 lines are split into chunks with 50-line overlap. Overlap ensures the LLM has context across chunk boundaries. Each chunk includes file path, language, and line range metadata.

### Prompt Design
- **Code Review**: Instructs Claude to act as a senior engineer. Requires structured output with severity rankings and specific line references.
- **Task-MD**: Instructs Claude to act as a PM. Translates technical changes into business impact with actionable sections.

### Error Recovery
- API rate limits (429) trigger exponential backoff with jitter
- API overload (529) triggers retry
- Auth errors (401) fail fast with setup instructions
- Partial failures generate reports for successful reviews and note failures

## Extending

### Add a New LLM Provider

1. Create `src/llm/openai.ts`:
```typescript
import { LLMProvider, LLMRequest, LLMResponse } from './provider';

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  initialize(config) { /* ... */ }
  isAvailable() { return true; }
  async complete(request) { /* ... */ }
}
```

2. Register in the orchestrator's `createProvider()` function.

### Add a New Output Format

1. Create `src/output/json-generator.ts`
2. Add a `--format` flag to the review command
3. Switch on format in the orchestrator

### Add Custom Prompts

Edit `src/llm/prompts/templates.ts` or create new template files. Use `{{variable}}`, `{{#if condition}}`, and `{{#each items}}` syntax.

## Common Issues

| Issue | Solution |
|-------|----------|
| "Git is not installed" | Install Git: `brew install git` (macOS) |
| "Not a git repository" | Run from a git repo root or `git init` |
| "No API key found" | Add `ANTHROPIC_API_KEY=sk-ant-...` to `.env` |
| "Rate limited" | Reduce `--concurrency` or wait and retry |
| "No staged changes" | Stage files: `git add <files>` |
| "File too large" | Increase `files.maxFileSize` in config |
| Build errors | Run `npm run clean && npm run build` |

## License

MIT
