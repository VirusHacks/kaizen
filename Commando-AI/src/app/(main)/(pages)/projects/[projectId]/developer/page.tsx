import React from 'react'
import { getProjectById } from '../../_actions/project-actions'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Code, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { getMyAssignedIssues, getDevStats } from './_actions/developer-actions'
import { getProjectWorkflow } from '@/app/(main)/(pages)/projects/[projectId]/project-manager/settings/workflow/_actions/workflow-actions'
import DeveloperDashboardClient from './_components/developer-dashboard-client'

type Props = {
  params: { projectId: string }
}

const DeveloperPage = async ({ params }: Props) => {
  const [projectResult, issuesResult, statsResult, workflowResult] = await Promise.all([
    getProjectById(params.projectId),
    getMyAssignedIssues(params.projectId),
    getDevStats(params.projectId),
    getProjectWorkflow(params.projectId),
  ])

  const { data: project, error: projectError } = projectResult

  if (projectError || !project) {
    notFound()
  }

  // Build transition map
  const transitionMap: Record<string, string[]> = {}
  if (workflowResult.data) {
    workflowResult.data.statuses.forEach((status: { status: string }) => {
      transitionMap[status.status] = []
    })
    workflowResult.data.transitions.forEach((t: { fromStatus: { status: string }; toStatus: { status: string } }) => {
      const fromStatus = t.fromStatus.status
      const toStatus = t.toStatus.status
      if (!transitionMap[fromStatus]) {
        transitionMap[fromStatus] = []
      }
      transitionMap[fromStatus].push(toStatus)
    })
  }

  return (
    <div className="flex flex-col relative h-full">
      {/* Header */}
      <div className="sticky top-0 z-[10] p-6 bg-background/50 backdrop-blur-lg border-b">
        <div className="flex items-center gap-4">
          <Link href="/projects">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
              <Code className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">Developer View</h1>
                <Badge variant="secondary" className="font-mono text-sm">
                  {project.key}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                {project.name}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <DeveloperDashboardClient
        projectId={params.projectId}
        projectKey={project.key}
        projectName={project.name}
        initialIssues={issuesResult.data || []}
        stats={statsResult.data || null}
        allowedTransitions={transitionMap}
      />
    </div>
  )
}

export default DeveloperPage
