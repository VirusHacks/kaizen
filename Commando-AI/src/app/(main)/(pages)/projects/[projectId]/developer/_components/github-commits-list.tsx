'use client'

import React, { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  GitCommit,
  ExternalLink,
  Loader2,
  AlertCircle,
  User,
  Clock,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react'
import { getProjectCommits } from '@/app/(main)/(pages)/projects/_actions/project-github-actions'
import { formatDistanceToNow } from 'date-fns'

type CommitAuthor = {
  name: string
  email: string
  date: string
}

type CommitUser = {
  login: string
  avatar_url: string
  html_url: string
}

type CommitData = {
  sha: string
  html_url: string
  commit: {
    message: string
    author: CommitAuthor | null
    committer: { name: string; date: string } | null
  }
  author: CommitUser | null
}

type Props = {
  projectId: string
}

export default function GitHubCommitsList({ projectId }: Props) {
  const [commits, setCommits] = useState<CommitData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedSha, setCopiedSha] = useState<string | null>(null)

  const fetchCommits = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getProjectCommits(projectId, { perPage: 50 })
      if (result.error) {
        setError(result.error)
      } else {
        setCommits((result.data as CommitData[]) || [])
      }
    } catch {
      setError('Failed to fetch commits')
    } finally {
      setIsLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchCommits() }, [projectId])

  const handleCopySha = (sha: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(sha)
    setCopiedSha(sha)
    setTimeout(() => setCopiedSha(null), 2000)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-sm">Loading commits...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <AlertCircle className="h-10 w-10 opacity-50 mb-4 text-destructive" />
        <p className="font-medium text-destructive">{error}</p>
        <p className="text-sm mt-1">Make sure a GitHub repo is linked to this project.</p>
      </div>
    )
  }

  // Group commits by date
  const grouped: Record<string, CommitData[]> = {}
  for (const commit of commits) {
    const dateStr = commit.commit.author?.date || commit.commit.committer?.date
    if (dateStr) {
      const day = new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      if (!grouped[day]) grouped[day] = []
      grouped[day].push(commit)
    }
  }

  const renderCommitItem = (commit: CommitData) => {
    const firstLine = commit.commit.message.split('\n')[0]
    const authorDate = commit.commit.author?.date || commit.commit.committer?.date
    const authorName = commit.author?.login || commit.commit.author?.name || 'Unknown'

    return (
      <div key={commit.sha} className="p-4 hover:bg-muted/50 transition-colors">
        <div className="flex items-start gap-3">
          {commit.author ? (
            <img
              src={commit.author.avatar_url}
              alt={commit.author.login}
              className="h-8 w-8 rounded-full shrink-0 mt-0.5"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-snug truncate">
              {firstLine}
            </p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" />
                {authorName}
              </span>
              {authorDate && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(authorDate), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={(e) => handleCopySha(commit.sha, e)}
              className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted"
              title="Copy full SHA"
            >
              {copiedSha === commit.sha ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              {commit.sha.substring(0, 7)}
            </button>
            <a
              href={commit.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 pb-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Recent Commits
          </h3>
          <Badge variant="secondary" className="font-mono">
            {commits.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchCommits}
          className="gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {commits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <GitCommit className="h-12 w-12 opacity-50 mb-4" />
          <p className="font-medium">No commits found</p>
          <p className="text-sm mt-1">
            Commits from the linked GitHub repository will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateLabel, dayCommits]) => (
            <div key={dateLabel}>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {dateLabel}
                </h4>
              </div>
              <div className="rounded-xl border overflow-hidden divide-y">
                {dayCommits.map(renderCommitItem)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
