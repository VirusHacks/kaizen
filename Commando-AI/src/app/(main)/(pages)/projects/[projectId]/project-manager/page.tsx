import React, { Suspense } from 'react';
import {
  Loader2,
  LayoutDashboard,
  ArrowLeft,
  ListTodo,
  Plus,
  LayoutGrid,
  Layers,
  GitBranch,
  Users,
  CalendarDays,
  Gauge,
} from 'lucide-react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getProjectDashboardData } from './dashboard/_actions/dashboard-actions';
import DashboardClient from './dashboard/_components/dashboard-client';
import PMAssistantChat from '@/components/pm-assistant-chat';
import { Badge } from '@/components/ui/badge';

type Props = {
  params: { projectId: string };
};

const DashboardContent = async ({ projectId }: { projectId: string }) => {
  const result = await getProjectDashboardData(projectId);

  if (result.error || !result.data) {
    if (result.error === 'Project not found or access denied') {
      notFound();
    }
    return (
      <div className="p-6 text-center text-muted-foreground">
        Failed to load dashboard: {result.error}
      </div>
    );
  }

  return (
    <>
      <DashboardClient data={result.data} />
      <PMAssistantChat
        projectId={projectId}
        projectName={result.data.project.name}
      />
    </>
  );
};

const ProjectDetailPage = async ({ params }: Props) => {
  // Get basic project info for the header
  const result = await getProjectDashboardData(params.projectId);
  const project = result.data?.project;

  return (
    <div className="flex flex-col relative">
      {/* Header */}
      <div className="sticky top-0 z-[10] p-6 bg-background/50 backdrop-blur-lg border-b">
        <div className="flex items-center gap-4">
          <Link href="/projects">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <LayoutDashboard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold">
                  {project?.name || 'Project Dashboard'}
                </h1>
                {project?.key && (
                  <Badge variant="secondary" className="font-mono text-xs">
                    {project.key}
                  </Badge>
                )}
                {project?.isArchived && (
                  <Badge
                    variant="outline"
                    className="text-muted-foreground text-xs"
                  >
                    Archived
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {project?.description ||
                  'Overview of project progress and activity'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-6 pb-0">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link
            href={`/projects/${params.projectId}/project-manager/issues`}
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
            href={`/projects/${params.projectId}/project-manager/issues/new`}
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
            href={`/projects/${params.projectId}/project-manager/board`}
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
            href={`/projects/${params.projectId}/project-manager/backlog`}
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
            href={`/projects/${params.projectId}/project-manager/settings/workflow`}
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
            href={`/projects/${params.projectId}/project-manager/timeline`}
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
            href={`/projects/${params.projectId}/project-manager/settings/team`}
            className="rounded-lg border p-4 hover:border-primary/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors">
                <Users className="h-5 w-5 text-indigo-500" />
              </div>
              <div>
                <p className="font-medium">Team</p>
                <p className="text-sm text-muted-foreground">Manage members</p>
              </div>
            </div>
          </Link>

          <Link
            href={`/projects/${params.projectId}/project-manager/resource-planning`}
            className="rounded-lg border p-4 hover:border-primary/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                <Gauge className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="font-medium">Resource Planning</p>
                <p className="text-sm text-muted-foreground">AI-powered allocation</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Dashboard Content */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center flex-1 py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <DashboardContent projectId={params.projectId} />
      </Suspense>
    </div>
  );
};

export default ProjectDetailPage;
