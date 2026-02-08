import { geminiClient } from './gemini.client'
import { z } from 'zod'

// ==========================================
// AI Commit Analyzer
// ==========================================
// Analyzes git commit messages against project issues
// and determines if any issue status should be updated.

/**
 * Schema for a single AI-suggested status update
 */
const CommitIssueMatchSchema = z.object({
  issueNumber: z.number(),
  issueTitle: z.string(),
  newStatus: z.enum(['IN_PROGRESS', 'IN_REVIEW', 'DONE']),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
})

const CommitAnalysisResponseSchema = z.object({
  matches: z.array(CommitIssueMatchSchema),
  summary: z.string(),
})

export type CommitIssueMatch = z.infer<typeof CommitIssueMatchSchema>
export type CommitAnalysisResponse = z.infer<typeof CommitAnalysisResponseSchema>

export type CommitInfo = {
  sha: string
  message: string
  author: string
  timestamp: string
  url?: string
}

export type ProjectIssueContext = {
  id: string
  number: number
  title: string
  description: string | null
  status: string
  type: string
  priority: string
  assigneeName: string | null
}

/**
 * Analyze commits against project issues using Gemini AI.
 * Returns suggested status updates for matched issues.
 */
export async function analyzeCommitsForStatusUpdate(
  commits: CommitInfo[],
  issues: ProjectIssueContext[],
  projectKey: string
): Promise<CommitAnalysisResponse> {
  if (commits.length === 0 || issues.length === 0) {
    return { matches: [], summary: 'No commits or issues to analyze.' }
  }

  const systemPrompt = `You are a smart project management AI that analyzes git commit messages to automatically update issue/task statuses on a Kanban board.

Your job: Given a list of recent commits and a list of project issues, determine which issues should have their status updated based on the commit messages.

## Rules for matching commits to issues:

1. **Direct references**: Commits referencing issue numbers like "${projectKey}-123", "#123", "issue 123", "fixes #123", "closes #123", "resolves #123"
2. **Keyword matching**: Commits whose message clearly relates to an issue title (e.g., commit "implement user login page" matches issue "Build user login page")
3. **Branch patterns**: Commit messages or merge commits referencing branch names like "feature/${projectKey.toLowerCase()}-123" or "fix/123"

## Rules for determining new status:

- **IN_REVIEW**: Use when commits indicate work is completed and ready for review. Keywords: "fix", "implement", "complete", "finish", "add", "build", "create", "resolve", "done", "ready for review", "PR", "pull request", "merge request"
- **DONE**: Use ONLY when commits explicitly say "closes", "fixes", "resolves" with an issue reference (this means the issue is fully resolved), OR when a merge commit merges a PR that was linked to the issue.
- **IN_PROGRESS**: Use when commits indicate partial work or WIP. Keywords: "wip", "work in progress", "start", "begin", "initial", "draft", "partial"

## Important:
- Only match with confidence >= 0.6
- Do NOT update issues that are already in DONE status
- Do NOT match unrelated commits
- Prefer IN_REVIEW over DONE unless there's an explicit "closes/fixes/resolves" keyword
- Return an empty matches array if no confident matches are found

Respond with valid JSON only.`

  const issueList = issues
    .filter((i) => i.status !== 'DONE')
    .map(
      (i) =>
        `- [${projectKey}-${i.number}] "${i.title}" (Status: ${i.status}, Type: ${i.type}, Priority: ${i.priority}${i.assigneeName ? `, Assigned: ${i.assigneeName}` : ''})`
    )
    .join('\n')

  const commitList = commits
    .map(
      (c) =>
        `- [${c.sha.substring(0, 7)}] ${c.message} (by ${c.author}, ${c.timestamp})`
    )
    .join('\n')

  const userPrompt = `## Project: ${projectKey}

## Recent Commits:
${commitList}

## Active Issues:
${issueList}

Analyze the commits and return which issues should have their status updated. Return JSON in this format:
{
  "matches": [
    {
      "issueNumber": 5,
      "issueTitle": "Build login page",
      "newStatus": "IN_REVIEW",
      "confidence": 0.85,
      "reason": "Commit abc1234 message 'implement login page UI' directly relates to this issue"
    }
  ],
  "summary": "1 issue matched: ${projectKey}-5 moved to IN_REVIEW based on implementation commit"
}`

  try {
    const result = await geminiClient.generateJSON<CommitAnalysisResponse>(
      systemPrompt,
      userPrompt,
      (data) => CommitAnalysisResponseSchema.parse(data),
      { temperature: 0.1, maxTokens: 2000, retries: 1 }
    )

    // Filter out low-confidence matches
    const filteredMatches = result.data.matches.filter(
      (m) => m.confidence >= 0.6
    )

    return {
      matches: filteredMatches,
      summary: result.data.summary,
    }
  } catch (error) {
    console.error('[COMMIT_ANALYZER] AI analysis failed:', error)
    return {
      matches: [],
      summary: 'AI analysis failed — no automatic updates applied.',
    }
  }
}
