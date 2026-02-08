'use client'

import React, { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CircleDot,
  CheckCircle2,
  MessageSquare,
  ExternalLink,
  Loader2,
  AlertCircle,
  Tag,
  User,
  Clock,
  RefreshCw,
} from 'lucide-react'
import { getProjectGitHubIssues } from '@/app/(main)/(pages)/projects/_actions/project-github-actions'
import { formatDistanceToNow } from 'date-fns'

type GitHubIssue = {
  id: number
  number: number
  title: string
  state: string
  body: string | null
  html_url: string
  comments: number
  created_at: string
  updated_at: string
  labels: Array<{
    id: number
    name: string
    color: string
  }>
  user: {
    login: string
    avatar_url: string
    html_url: string
  } | null
  assignee: {
    login: string
    avatar_url: string
  } | null
  assignees: Array<{
    login: string
    avatar_url: string
  }>
}

type Props = {
  projectId: string
}

export default function GitHubIssuesList({ projectId }: Props) {
  const [issues, setIssues] = useState<GitHubIssue[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stateFilter, setStateFilter] = useState<'open' | 'closed' | 'all'>('open')
  const [expandedIssue, setExpandedIssue] = useState<number | null>(null)

  const fetchIssues = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getProjectGitHubIssues(projectId, {
        state: stateFilter,
        perPage: 50,
        sort: 'updated',
        direction: 'desc',
      })
      if (result.error) {
        setError(result.error)
      } else {
        setIssues((result.data as GitHubIssue[]) || [])
      }
    } catch {
      setError('Failed to fetch issues')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchIssues()
  }, [projectId, stateFilter])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-sm">Loading GitHub issues...</p>
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

  return (
    <div className="px-6 pb-6 space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border bg-muted/30 p-0.5 gap-0.5">
            {(['open', 'closed', 'all'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStateFilter(s)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5',
                  stateFilter === s
                    ? 'bg-background shadow text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {s === 'open' && <CircleDot className="h-3 w-3 text-green-500" />}
                {s === 'closed' && <CheckCircle2 className="h-3 w-3 text-purple-500" />}
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <Badge variant="secondary" className="font-mono">{issues.length}</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchIssues} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Issues List */}
      {issues.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <CircleDot className="h-12 w-12 opacity-50 mb-4" />
          <p className="font-medium">No {stateFilter !== 'all' ? stateFilter : ''} issues found</p>
          <p className="text-sm mt-1">Issues from the linked GitHub repository will appear here.</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden divide-y">
          {issues.map((issue) => (
            <div
              key={issue.id}
              className={cn(
                'p-4 transition-colors hover:bg-muted/50 cursor-pointer',
                expandedIssue === issue.id && 'bg-muted/30'
              )}
              onClick={() => setExpandedIssue(expandedIssue === issue.id ? null : issue.id)}
            >
              <div className="flex items-start gap-3">
                {/* State icon */}
                {issue.state === 'open' ? (
                  <CircleDot className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-purple-500 shrink-0 mt-0.5" />
                )}

                <div className="flex-1 min-w-0">
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-snug">
                        {issue.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          #{issue.number}
                        </span>
                        {issue.user && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {issue.user.login}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(issue.updated_at), { addSuffix: true })}
                        </span>
                        {issue.comments > 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {issue.comments}
                          </span>
                        )}
                      </div>
                    </div>

                    <a
                      href={issue.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>

                  {/* Labels */}
                  {issue.labels.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {issue.labels.map((label) => (
                        <Badge
                          key={label.id}
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-5 gap-1"
                          style={{
                            borderColor: `#${label.color}`,
                            color: `#${label.color}`,
                          }}
                        >
                          <Tag className="h-2.5 w-2.5" />
                          {label.name}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Assignees */}
                  {issue.assignees && issue.assignees.length > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      {issue.assignees.map((a) => (
                        <img
                          key={a.login}
                          src={a.avatar_url}
                          alt={a.login}
                          title={a.login}
                          className="h-5 w-5 rounded-full ring-2 ring-background"
                        />
                      ))}
                    </div>
                  )}

                  {/* Expanded body */}
                  {expandedIssue === issue.id && issue.body && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-10">
                        {issue.body}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
