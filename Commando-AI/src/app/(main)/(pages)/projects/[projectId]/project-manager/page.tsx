import React from 'react'
import { getProjectById } from '../_actions/project-actions'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FolderKanban, Calendar, ArrowLeft, ListTodo, Plus, LayoutGrid, Layers, GitBranch, Settings, Users, CalendarDays, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'

type Props = {
  params: { projectId: string }
}

const ProjectDetailPage = async ({ params }: Props) => {
  const { data: project, error } = await getProjectById(params.projectId)

  if (error || !project) {
    notFound()
  }

  return (
    <div className="flex flex-col relative">
      <div className="sticky top-0 z-[10] p-6 bg-background/50 backdrop-blur-lg border-b">
        <div className="flex items-center gap-4">
          <Link href="/projects">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <FolderKanban className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{project.name}</h1>
                <Badge variant="secondary" className="font-mono text-sm">
                  {project.key}
                </Badge>
                {project.isArchived && (
                  <Badge variant="outline" className="text-muted-foreground">
                    Archived
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-sm">
                {project.description || 'No description'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link
            href={`/projects/${params.projectId}/dashboard`}
            className="rounded-lg border p-4 hover:border-primary/50 transition-colors group bg-primary/5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-colors">
                <LayoutDashboard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Dashboard</p>
                <p className="text-sm text-muted-foreground">
                  Project overview
                </p>
              </div>
            </div>
          </Link>

          <Link
            href={`/projects/${params.projectId}/issues`}
            className="rounded-lg border p-4 hover:border-primary/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                <ListTodo className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="font-medium">Issues</p>
                <p className="text-sm text-muted-foreground">
                  View & manage tasks
                </p>
              </div>
            </div>
          </Link>

          <Link
            href={`/projects/${params.projectId}/issues/new`}
            className="rounded-lg border p-4 hover:border-primary/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                <Plus className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="font-medium">New Issue</p>
                <p className="text-sm text-muted-foreground">
                  Create a task or bug
                </p>
              </div>
            </div>
          </Link>

          <Link
            href={`/projects/${params.projectId}/board`}
            className="rounded-lg border p-4 hover:border-primary/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                <LayoutGrid className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="font-medium">Kanban Board</p>
                <p className="text-sm text-muted-foreground">
                  Visual task management
                </p>
              </div>
            </div>
          </Link>

          <Link
            href={`/projects/${params.projectId}/backlog`}
            className="rounded-lg border p-4 hover:border-primary/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors">
                <Layers className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="font-medium">Backlog</p>
                <p className="text-sm text-muted-foreground">
                  Sprint planning & backlog
                </p>
              </div>
            </div>
          </Link>

          <Link
            href={`/projects/${params.projectId}/settings/workflow`}
            className="rounded-lg border p-4 hover:border-primary/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors">
                <GitBranch className="h-5 w-5 text-cyan-500" />
              </div>
              <div>
                <p className="font-medium">Workflow</p>
                <p className="text-sm text-muted-foreground">
                  Status transitions
                </p>
              </div>
            </div>
          </Link>

          <Link
            href={`/projects/${params.projectId}/timeline`}
            className="rounded-lg border p-4 hover:border-primary/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-500/10 group-hover:bg-pink-500/20 transition-colors">
                <CalendarDays className="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <p className="font-medium">Timeline</p>
                <p className="text-sm text-muted-foreground">
                  Gantt-style view
                </p>
              </div>
            </div>
          </Link>

          <Link
            href={`/projects/${params.projectId}/settings/team`}
            className="rounded-lg border p-4 hover:border-primary/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors">
                <Users className="h-5 w-5 text-indigo-500" />
              </div>
              <div>
                <p className="font-medium">Team</p>
                <p className="text-sm text-muted-foreground">
                  Manage members
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* Project Info Card */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Calendar className="h-4 w-4" />
              Created
            </div>
            <p className="font-medium">
              {new Date(project.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Calendar className="h-4 w-4" />
              Last Updated
            </div>
            <p className="font-medium">
              {new Date(project.updatedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProjectDetailPage
