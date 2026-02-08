'use client'

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  LayoutGrid,
  List,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Activity,
  Target,
  ArrowUp,
  ArrowDown,
  Minus,
  Zap,
  Bug,
  BookOpen,
  CheckSquare,
  Layers,
  Timer,
  TrendingUp,
  GitBranch,
  CircleDot,
  GitCommit,
  Github,
  Loader2,
  Users,
  User,
  ExternalLink,
  Bot,
  RefreshCw,
  X,
  ArrowRight,
} from 'lucide-react'
import DevKanbanBoard from './dev-kanban-board'
import TaskDetailPanel from './task-detail-panel'
import GitHubCommitsList from './github-commits-list'
import { getProjectGitHubIssues } from '@/app/(main)/(pages)/projects/_actions/project-github-actions'
import { getRecentlyUpdatedIssues } from '../_actions/developer-actions'

// ==========================================
// TYPES
// ==========================================

export type DevIssue = {
  id: string
  number: number
  title: string
  description: string | null
  type: string
  status: string
  priority: string
  createdAt: string | Date
  updatedAt: string | Date
  startDate: string | Date | null
  dueDate: string | Date | null
  assignee: {
    clerkId: string
    name: string | null
    email: string
    profileImage: string | null
  } | null
  reporter: {
    clerkId: string
    name: string | null
    email: string
    profileImage: string | null
  }
  parent: {
    id: string
    title: string
    number: number
    type: string
  } | null
  sprint: {
    id: string
    name: string
    status: string
  } | null
  _count: {
    children: number
  }
  // Source tracking
  source?: 'project' | 'github'
  githubUrl?: string
  githubLabels?: Array<{ id: number; name: string; color: string }>
}

type GitHubIssueRaw = {
  id: number
  number: number
  title: string
  state: string
  body: string | null
  html_url: string
  comments: number
  created_at: string
  updated_at: string
  labels: Array<{ id: number; name: string; color: string }>
  user: { login: string; avatar_url: string; html_url: string } | null
  assignee: { login: string; avatar_url: string } | null
  assignees: Array<{ login: string; avatar_url: string }>
}

type DevStats = {
  total: number
  todo: number
  inProgress: number
  inReview: number
  done: number
  critical: number
  high: number
  completionRate: number
  activeSprint: {
    id: string
    name: string
    endDate: string | null
    myIssueCount: number
  } | null
} | null

type Props = {
  projectId: string
  projectKey: string
  projectName: string
  initialIssues: DevIssue[]
  allProjectIssues: DevIssue[]
  stats: DevStats
  allowedTransitions: Record<string, string[]>
}

// ==========================================
// STAT CARDS
// ==========================================

const StatCard = ({
  icon: Icon,
  label,
  value,
  color,
  subtext,
}: {
  icon: React.ElementType
  label: string
  value: number | string
  color: string
  subtext?: string
}) => (
  <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
    <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', color)}>
      <Icon className="h-5 w-5" />
    </div>
    <div className="min-w-0">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground truncate">{label}</p>
      {subtext && <p className="text-xs text-muted-foreground/70 mt-0.5">{subtext}</p>}
    </div>
  </div>
)

// ==========================================
// PRIORITY / TYPE ICONS
// ==========================================

const priorityConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  CRITICAL: { icon: AlertTriangle, color: 'text-red-500', label: 'Critical' },
  HIGH: { icon: ArrowUp, color: 'text-orange-500', label: 'High' },
  MEDIUM: { icon: Minus, color: 'text-yellow-500', label: 'Medium' },
  LOW: { icon: ArrowDown, color: 'text-gray-400', label: 'Low' },
}

const typeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  EPIC: { icon: Zap, color: 'text-purple-500', label: 'Epic' },
  STORY: { icon: BookOpen, color: 'text-green-500', label: 'Story' },
  TASK: { icon: CheckSquare, color: 'text-blue-500', label: 'Task' },
  BUG: { icon: Bug, color: 'text-red-500', label: 'Bug' },
  SUBTASK: { icon: Layers, color: 'text-gray-500', label: 'Subtask' },
  GITHUB_ISSUE: { icon: CircleDot, color: 'text-green-500', label: 'GitHub Issue' },
}

const statusColors: Record<string, string> = {
  TODO: 'bg-gray-500',
  IN_PROGRESS: 'bg-blue-500',
  IN_REVIEW: 'bg-yellow-500',
  DONE: 'bg-green-500',
}

const statusLabels: Record<string, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
}

// ==========================================
// GITHUB → KANBAN MAPPERS
// ==========================================

function mapGitHubStateToStatus(state: string): string {
  return state === 'closed' ? 'DONE' : 'TODO'
}

function inferPriorityFromLabels(labels: Array<{ name: string }>): string {
  const names = labels.map((l) => l.name.toLowerCase())
  if (names.some((n) => n.includes('critical') || n.includes('urgent') || n.includes('p0'))) return 'CRITICAL'
  if (names.some((n) => n.includes('high') || n.includes('p1') || n.includes('important'))) return 'HIGH'
  if (names.some((n) => n.includes('low') || n.includes('p3') || n.includes('minor'))) return 'LOW'
  return 'MEDIUM'
}

function inferTypeFromLabels(labels: Array<{ name: string }>): string {
  const names = labels.map((l) => l.name.toLowerCase())
  if (names.some((n) => n.includes('bug'))) return 'BUG'
  if (names.some((n) => n.includes('feature') || n.includes('enhancement'))) return 'STORY'
  if (names.some((n) => n.includes('epic'))) return 'EPIC'
  return 'GITHUB_ISSUE'
}

function convertGitHubIssue(gh: GitHubIssueRaw): DevIssue {
  return {
    id: `gh-${gh.id}`,
    number: gh.number,
    title: gh.title,
    description: gh.body,
    type: inferTypeFromLabels(gh.labels),
    status: mapGitHubStateToStatus(gh.state),
    priority: inferPriorityFromLabels(gh.labels),
    createdAt: gh.created_at,
    updatedAt: gh.updated_at,
    startDate: null,
    dueDate: null,
    assignee: gh.assignee
      ? { clerkId: `gh-${gh.assignee.login}`, name: gh.assignee.login, email: '', profileImage: gh.assignee.avatar_url }
      : null,
    reporter: {
      clerkId: gh.user ? `gh-${gh.user.login}` : 'gh-unknown',
      name: gh.user?.login || 'Unknown',
      email: '',
      profileImage: gh.user?.avatar_url || null,
    },
    parent: null,
    sprint: null,
    _count: { children: 0 },
    source: 'github',
    githubUrl: gh.html_url,
    githubLabels: gh.labels,
  }
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function DeveloperDashboardClient({
  projectId,
  projectKey,
  projectName,
  initialIssues,
  allProjectIssues,
  stats,
  allowedTransitions,
}: Props) {
  const router = useRouter()
  const [view, setView] = useState<'board' | 'list'>('board')
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'todo' | 'review'>('all')
  const [sourceFilter, setSourceFilter] = useState<'all' | 'mine' | 'project' | 'github'>('all')
  const [mainTab, setMainTab] = useState<'tasks' | 'commits'>('tasks')

  // GitHub issues
  const [githubIssues, setGithubIssues] = useState<DevIssue[]>([])
  const [isLoadingGithub, setIsLoadingGithub] = useState(true)

  // AI auto-update notifications
  type AutoUpdateNotification = {
    id: string
    number: number
    title: string
    status: string
    updatedAt: string
  }
  const [autoUpdateNotifications, setAutoUpdateNotifications] = useState<AutoUpdateNotification[]>([])
  const [showAutoUpdateBanner, setShowAutoUpdateBanner] = useState(false)
  const knownIssueVersions = useRef<Map<string, string>>(new Map())
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize known issue versions from SSR data
  useEffect(() => {
    const map = new Map<string, string>()
    for (const issue of allProjectIssues) {
      map.set(issue.id, `${issue.status}|${new Date(issue.updatedAt).getTime()}`)
    }
    knownIssueVersions.current = map
  }, []) // only on mount — SSR baseline

  // Poll for auto-updates every 15 seconds
  useEffect(() => {
    const poll = async () => {
      try {
        const result = await getRecentlyUpdatedIssues(projectId, 2)
        if (!result.data) return

        const newUpdates: AutoUpdateNotification[] = []
        for (const issue of result.data) {
          const key = `${issue.status}|${new Date(issue.updatedAt).getTime()}`
          const known = knownIssueVersions.current.get(issue.id)
          if (known && known !== key) {
            newUpdates.push({
              id: issue.id,
              number: issue.number,
              title: issue.title,
              status: issue.status,
              updatedAt: new Date(issue.updatedAt).toISOString(),
            })
          }
          knownIssueVersions.current.set(issue.id, key)
        }

        if (newUpdates.length > 0) {
          setAutoUpdateNotifications(newUpdates)
          setShowAutoUpdateBanner(true)
          // Refresh server data so the kanban board reflects new statuses
          router.refresh()
        }
      } catch {
        // Polling is best-effort
      }
    }

    pollIntervalRef.current = setInterval(poll, 15000)
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [projectId, router])

  const dismissAutoUpdateBanner = useCallback(() => {
    setShowAutoUpdateBanner(false)
    setAutoUpdateNotifications([])
  }, [])

  useEffect(() => {
    const fetchGithub = async () => {
      setIsLoadingGithub(true)
      try {
        const result = await getProjectGitHubIssues(projectId, {
          state: 'all',
          perPage: 100,
          sort: 'updated',
          direction: 'desc',
        })
        if (result.data && Array.isArray(result.data)) {
          setGithubIssues((result.data as GitHubIssueRaw[]).map(convertGitHubIssue))
        }
      } catch {
        // GitHub issues are supplementary – fail silently
      } finally {
        setIsLoadingGithub(false)
      }
    }
    fetchGithub()
  }, [projectId])

  // Tag PM issues with source + whether they're mine
  const taggedProjectIssues = useMemo(() => {
    const myIds = new Set(initialIssues.map((i) => i.id))
    return allProjectIssues.map((issue) => ({
      ...issue,
      source: 'project' as const,
      _isMine: myIds.has(issue.id),
    }))
  }, [allProjectIssues, initialIssues])

  // Combine PM + GitHub issues
  const allCombinedIssues = useMemo(() => {
    return [
      ...taggedProjectIssues,
      ...githubIssues.map((gh) => ({ ...gh, _isMine: false as boolean })),
    ]
  }, [taggedProjectIssues, githubIssues])

  // Source filter
  const sourceFiltered = useMemo(() => {
    switch (sourceFilter) {
      case 'mine':    return allCombinedIssues.filter((i) => i._isMine)
      case 'project': return allCombinedIssues.filter((i) => i.source === 'project')
      case 'github':  return allCombinedIssues.filter((i) => i.source === 'github')
      default:        return allCombinedIssues
    }
  }, [allCombinedIssues, sourceFilter])

  // Status filter
  const filteredIssues = useMemo(() => {
    switch (filter) {
      case 'active': return sourceFiltered.filter((i) => i.status === 'IN_PROGRESS')
      case 'todo':   return sourceFiltered.filter((i) => i.status === 'TODO')
      case 'review': return sourceFiltered.filter((i) => i.status === 'IN_REVIEW')
      default:       return sourceFiltered
    }
  }, [sourceFiltered, filter])

  const selectedIssue = useMemo(
    () => allCombinedIssues.find((i) => i.id === selectedIssueId) || null,
    [allCombinedIssues, selectedIssueId]
  )

  const handleSelectIssue = useCallback((issueId: string) => {
    setSelectedIssueId((prev) => (prev === issueId ? null : issueId))
  }, [])

  const mineCount = allCombinedIssues.filter((i) => i._isMine).length
  const projectCount = allCombinedIssues.filter((i) => i.source === 'project').length
  const ghCount = githubIssues.length

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Main Area */}
      <div className={cn('flex-1 flex flex-col overflow-hidden', selectedIssue && 'mr-0')}>
        {/* AI Auto-Update Notification Banner */}
        {showAutoUpdateBanner && autoUpdateNotifications.length > 0 && (
          <div className="mx-6 mt-4 rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                  <Bot className="h-4 w-4 text-blue-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium flex items-center gap-2">
                    AI Auto-Update
                    <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20">
                      from commit
                    </Badge>
                  </p>
                  <div className="space-y-1">
                    {autoUpdateNotifications.map((n) => (
                      <div key={n.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono text-blue-400">{projectKey}-{n.number}</span>
                        <span className="truncate max-w-[300px]">{n.title}</span>
                        <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] px-1.5 py-0',
                            n.status === 'IN_REVIEW' && 'border-yellow-500/50 text-yellow-400',
                            n.status === 'DONE' && 'border-green-500/50 text-green-400',
                            n.status === 'IN_PROGRESS' && 'border-blue-500/50 text-blue-400'
                          )}
                        >
                          {statusLabels[n.status] || n.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground/60 mt-1">
                    AI analyzed recent commits and automatically updated the board.
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={dismissAutoUpdateBanner}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Stats Row */}
        {stats && (
          <div className="p-6 pb-0">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <StatCard icon={Target} label="My Tasks" value={stats.total} color="bg-primary/10 text-primary" />
              <StatCard icon={Clock} label="To Do" value={stats.todo} color="bg-gray-500/10 text-gray-500" />
              <StatCard icon={Activity} label="In Progress" value={stats.inProgress} color="bg-blue-500/10 text-blue-500" />
              <StatCard icon={Timer} label="In Review" value={stats.inReview} color="bg-yellow-500/10 text-yellow-500" />
              <StatCard icon={CheckCircle2} label="Done" value={stats.done} color="bg-green-500/10 text-green-500" />
              <StatCard
                icon={TrendingUp}
                label="Completion"
                value={`${stats.completionRate}%`}
                color="bg-emerald-500/10 text-emerald-500"
                subtext={stats.activeSprint ? `Sprint: ${stats.activeSprint.name}` : undefined}
              />
            </div>
          </div>
        )}

        {/* Main Tabs: Board | Commits */}
        <div className="px-6 pt-4 pb-0">
          <div className="flex items-center border-b">
            <button
              onClick={() => setMainTab('tasks')}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                mainTab === 'tasks'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              Board
              <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 h-5">
                {filteredIssues.length}
              </Badge>
            </button>
            <button
              onClick={() => setMainTab('commits')}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                mainTab === 'commits'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
              )}
            >
              <GitCommit className="h-4 w-4" />
              Commits
            </button>
          </div>
        </div>

        {mainTab === 'tasks' && (
          <>
            {/* Tasks Toolbar */}
            <div className="px-6 pt-4 pb-2 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Board</h2>
                <Badge variant="secondary" className="font-mono">
                  {filteredIssues.length}
                </Badge>
                {isLoadingGithub && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span className="text-xs">Loading GitHub issues...</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Source filter pills */}
                <div className="flex items-center rounded-lg border bg-muted/30 p-0.5 gap-0.5">
                  <button
                    onClick={() => setSourceFilter('all')}
                    className={cn(
                      'px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5',
                      sourceFilter === 'all'
                        ? 'bg-background shadow text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    All
                    <span className="text-[10px] opacity-60">{allCombinedIssues.length}</span>
                  </button>
                  <button
                    onClick={() => setSourceFilter('mine')}
                    className={cn(
                      'px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5',
                      sourceFilter === 'mine'
                        ? 'bg-background shadow text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <User className="h-3 w-3" />
                    My Tasks
                    <span className="text-[10px] opacity-60">{mineCount}</span>
                  </button>
                  <button
                    onClick={() => setSourceFilter('project')}
                    className={cn(
                      'px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5',
                      sourceFilter === 'project'
                        ? 'bg-background shadow text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Users className="h-3 w-3" />
                    Project
                    <span className="text-[10px] opacity-60">{projectCount}</span>
                  </button>
                  <button
                    onClick={() => setSourceFilter('github')}
                    className={cn(
                      'px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5',
                      sourceFilter === 'github'
                        ? 'bg-background shadow text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Github className="h-3 w-3" />
                    GitHub
                    <span className="text-[10px] opacity-60">{ghCount}</span>
                  </button>
                </div>

                {/* Status filter pills */}
                <div className="flex items-center rounded-lg border bg-muted/30 p-0.5 gap-0.5">
                  {(['all', 'active', 'todo', 'review'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={cn(
                        'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                        filter === f
                          ? 'bg-background shadow text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {f === 'all' ? 'All' : f === 'active' ? 'Active' : f === 'todo' ? 'To Do' : 'Review'}
                    </button>
                  ))}
                </div>

                {/* View toggle */}
                <div className="flex items-center rounded-lg border bg-muted/30 p-0.5 gap-0.5">
                  <button
                    onClick={() => setView('board')}
                    className={cn(
                      'p-1.5 rounded-md transition-colors',
                      view === 'board' ? 'bg-background shadow' : 'text-muted-foreground hover:text-foreground'
                    )}
                    title="Board view"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setView('list')}
                    className={cn(
                      'p-1.5 rounded-md transition-colors',
                      view === 'list' ? 'bg-background shadow' : 'text-muted-foreground hover:text-foreground'
                    )}
                    title="List view"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Tasks Content */}
            <div className="flex-1 overflow-auto">
              {filteredIssues.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 opacity-50 mb-4" />
                  <p className="font-medium">
                    {filter === 'all'
                      ? sourceFilter === 'mine'
                        ? 'No tasks assigned to you yet'
                        : sourceFilter === 'github'
                        ? 'No GitHub issues found'
                        : 'No tasks found'
                      : `No ${filter} tasks`}
                  </p>
                  <p className="text-sm mt-1">
                    {filter === 'all' && sourceFilter === 'mine'
                      ? 'Ask your project manager to assign tasks to you.'
                      : sourceFilter === 'github'
                      ? 'Make sure a GitHub repository is linked to this project.'
                      : 'Try a different filter.'}
                  </p>
                </div>
              ) : view === 'board' ? (
                <DevKanbanBoard
                  issues={filteredIssues}
                  projectId={projectId}
                  projectKey={projectKey}
                  allowedTransitions={allowedTransitions}
                  onSelectIssue={handleSelectIssue}
                  selectedIssueId={selectedIssueId}
                />
              ) : (
                /* List View */
                <div className="px-6 pb-6">
                  <div className="rounded-xl border overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left text-xs font-medium text-muted-foreground p-3 w-10">Src</th>
                          <th className="text-left text-xs font-medium text-muted-foreground p-3">Key</th>
                          <th className="text-left text-xs font-medium text-muted-foreground p-3">Title</th>
                          <th className="text-left text-xs font-medium text-muted-foreground p-3">Type</th>
                          <th className="text-left text-xs font-medium text-muted-foreground p-3">Status</th>
                          <th className="text-left text-xs font-medium text-muted-foreground p-3">Priority</th>
                          <th className="text-left text-xs font-medium text-muted-foreground p-3">Sprint / Labels</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredIssues.map((issue) => {
                          const tc = typeConfig[issue.type] || typeConfig.TASK
                          const pc = priorityConfig[issue.priority] || priorityConfig.MEDIUM
                          const TypeIcon = tc.icon
                          const PriorityIcon = pc.icon
                          const isGH = issue.source === 'github'

                          return (
                            <tr
                              key={issue.id}
                              onClick={() => {
                                if (isGH && issue.githubUrl) {
                                  window.open(issue.githubUrl, '_blank')
                                } else {
                                  handleSelectIssue(issue.id)
                                }
                              }}
                              className={cn(
                                'border-b last:border-b-0 cursor-pointer transition-colors hover:bg-muted/50',
                                selectedIssueId === issue.id && 'bg-primary/5'
                              )}
                            >
                              <td className="p-3">
                                {isGH ? (
                                  <Github className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <CheckSquare className="h-4 w-4 text-blue-500" />
                                )}
                              </td>
                              <td className="p-3 font-mono text-xs text-muted-foreground">
                                {isGH ? `#${issue.number}` : `${projectKey}-${issue.number}`}
                              </td>
                              <td className="p-3 text-sm font-medium max-w-[300px] truncate">
                                <div className="flex items-center gap-2">
                                  {issue.title}
                                  {isGH && <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />}
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-1.5">
                                  <TypeIcon className={cn('h-3.5 w-3.5', tc.color)} />
                                  <span className="text-xs">{tc.label}</span>
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-1.5">
                                  <div className={cn('w-2 h-2 rounded-full', statusColors[issue.status])} />
                                  <span className="text-xs">{statusLabels[issue.status] || issue.status}</span>
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-1.5">
                                  <PriorityIcon className={cn('h-3.5 w-3.5', pc.color)} />
                                  <span className="text-xs">{pc.label}</span>
                                </div>
                              </td>
                              <td className="p-3 text-xs text-muted-foreground">
                                {issue.sprint?.name || (isGH && issue.githubLabels && issue.githubLabels.length > 0 ? (
                                  <span className="flex items-center gap-1 flex-wrap">
                                    {issue.githubLabels.slice(0, 2).map((l) => (
                                      <span
                                        key={l.id}
                                        className="inline-block px-1.5 py-0.5 rounded text-[10px]"
                                        style={{
                                          backgroundColor: `#${l.color}20`,
                                          color: `#${l.color}`,
                                          border: `1px solid #${l.color}40`,
                                        }}
                                      >
                                        {l.name}
                                      </span>
                                    ))}
                                  </span>
                                ) : '—')}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Commits Tab Content */}
        {mainTab === 'commits' && (
          <div className="flex-1 overflow-auto">
            <GitHubCommitsList projectId={projectId} />
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedIssue && selectedIssue.source !== 'github' && mainTab === 'tasks' && (
        <TaskDetailPanel
          issue={selectedIssue}
          projectId={projectId}
          projectKey={projectKey}
          onClose={() => setSelectedIssueId(null)}
        />
      )}
    </div>
  )
}
