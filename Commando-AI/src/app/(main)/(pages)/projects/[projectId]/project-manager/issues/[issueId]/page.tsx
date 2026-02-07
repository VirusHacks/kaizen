import React from 'react'
import { getIssueById } from '../_actions/issue-actions'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  ArrowLeft,
  Bug,
  Zap,
  BookOpen,
  CheckSquare,
  Layers,
  ArrowUp,
  ArrowDown,
  Minus,
  AlertTriangle,
  Calendar,
} from 'lucide-react'
import Link from 'next/link'
import { IssueType, IssuePriority } from '@/lib/types'
import IssueStatusChanger from './_components/issue-status-changer'
import IssueActions from './_components/issue-actions'
import AIAssigneeSuggestionButton from './_components/ai-assignee-suggestion-button'

const issueTypeIcons: Record<IssueType, React.ReactNode> = {
  EPIC: <Zap className="h-5 w-5 text-purple-500" />,
  STORY: <BookOpen className="h-5 w-5 text-green-500" />,
  TASK: <CheckSquare className="h-5 w-5 text-blue-500" />,
  BUG: <Bug className="h-5 w-5 text-red-500" />,
  SUBTASK: <Layers className="h-5 w-5 text-gray-500" />,
}

const issueTypeLabels: Record<IssueType, string> = {
  EPIC: 'Epic',
  STORY: 'Story',
  TASK: 'Task',
  BUG: 'Bug',
  SUBTASK: 'Subtask',
}

const priorityIcons: Record<IssuePriority, React.ReactNode> = {
  LOW: <ArrowDown className="h-4 w-4 text-gray-400" />,
  MEDIUM: <Minus className="h-4 w-4 text-yellow-500" />,
  HIGH: <ArrowUp className="h-4 w-4 text-orange-500" />,
  CRITICAL: <AlertTriangle className="h-4 w-4 text-red-500" />,
}

const priorityLabels: Record<IssuePriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
}

type Props = {
  params: { projectId: string; issueId: string }
}

// Type for the issue returned from getIssueById
type IssueWithRelations = {
  id: string
  number: number
  title: string
  description: string | null
  type: IssueType
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'
  priority: IssuePriority
  assigneeId: string | null
  project: { key: string }
  assignee: { clerkId: string; name: string | null; email: string; profileImage: string | null } | null
  reporter: { clerkId: string; name: string | null; email: string; profileImage: string | null }
  parent: { id: string; number: number; title: string } | null
  children: Array<{
    id: string
    number: number
    title: string
    assignee: { clerkId: string; name: string | null; profileImage: string | null } | null
  }>
  dueDate: Date | null
  createdAt: Date
  updatedAt: Date
}

const IssueDetailPage = async ({ params }: Props) => {
  const { data, error } = await getIssueById(params.issueId)

  if (error || !data) {
    notFound()
  }

  const issue = data as IssueWithRelations
  const issueKey = `${issue.project.key}-${issue.number}`

  return (
    <div className="flex flex-col relative">
      <div className="sticky top-0 z-[10] p-6 bg-background/50 backdrop-blur-lg border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/projects/${params.projectId}/issues`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              {issueTypeIcons[issue.type]}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-muted-foreground">
                    {issueKey}
                  </span>
                  <Badge variant="secondary">{issueTypeLabels[issue.type]}</Badge>
                </div>
                <h1 className="text-xl font-bold">{issue.title}</h1>
              </div>
            </div>
          </div>
          <IssueActions issue={issue} projectId={params.projectId} />
        </div>
      </div>

      <div className="p-6 grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Description</h2>
            {issue.description ? (
              <div className="prose dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap">{issue.description}</p>
              </div>
            ) : (
              <p className="text-muted-foreground italic">
                No description provided
              </p>
            )}
          </div>

          {/* Subtasks */}
          {issue.children && issue.children.length > 0 && (
            <div className="rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">
                Subtasks ({issue.children.length})
              </h2>
              <div className="space-y-2">
                {issue.children.map((subtask) => (
                  <Link
                    key={subtask.id}
                    href={`/projects/${params.projectId}/issues/${subtask.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary/50 transition-colors"
                  >
                    <Layers className="h-4 w-4 text-gray-500" />
                    <span className="font-mono text-sm text-muted-foreground">
                      {issue.project.key}-{subtask.number}
                    </span>
                    <span className="flex-1 truncate">{subtask.title}</span>
                    {subtask.assignee && (
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={subtask.assignee.profileImage || undefined} />
                        <AvatarFallback className="text-xs">
                          {(subtask.assignee.name || '?').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Parent Issue */}
          {issue.parent && (
            <div className="rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Parent Issue</h2>
              <Link
                href={`/projects/${params.projectId}/issues/${issue.parent.id}`}
                className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary/50 transition-colors"
              >
                <span className="font-mono text-sm text-muted-foreground">
                  {issue.project.key}-{issue.parent.number}
                </span>
                <span className="flex-1 truncate">{issue.parent.title}</span>
              </Link>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="rounded-lg border p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Status
            </h3>
            <IssueStatusChanger
              issueId={issue.id}
              currentStatus={issue.status}
            />
          </div>

          {/* Details */}
          <div className="rounded-lg border p-4 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Priority
              </h3>
              <div className="flex items-center gap-2">
                {priorityIcons[issue.priority]}
                <span>{priorityLabels[issue.priority]}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Assignee
                </h3>
                <AIAssigneeSuggestionButton
                  issueId={issue.id}
                  issueKey={issueKey}
                  issueTitle={issue.title}
                  projectId={params.projectId}
                />
              </div>
              {issue.assignee ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={issue.assignee.profileImage || undefined} />
                    <AvatarFallback className="text-xs">
                      {(issue.assignee.name || issue.assignee.email)
                        .charAt(0)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span>{issue.assignee.name || issue.assignee.email}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">Unassigned</span>
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Reporter
              </h3>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={issue.reporter.profileImage || undefined} />
                  <AvatarFallback className="text-xs">
                    {(issue.reporter.name || issue.reporter.email)
                      .charAt(0)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>{issue.reporter.name || issue.reporter.email}</span>
              </div>
            </div>

            {issue.dueDate && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Due Date
                </h3>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(issue.dueDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="rounded-lg border p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>
                {new Date(issue.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Updated</span>
              <span>
                {new Date(issue.updatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default IssueDetailPage
