import React, { Suspense } from 'react'
import { Loader2, Bot, ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getAgentDashboardData, initializeAgents, getCostAndHealthData } from './_actions/agent-actions'
import AgentDashboardClient from './_components/agent-dashboard-client'

type Props = {
  params: { projectId: string }
}

const AgentDashboardContent = async ({ projectId }: { projectId: string }) => {
  // Ensure agents exist
  await initializeAgents(projectId)

  const [data, costHealthData] = await Promise.all([
    getAgentDashboardData(projectId),
    getCostAndHealthData(projectId).catch(() => null),
  ])
  if (!data) {
    notFound()
  }
  return (
    <AgentDashboardClient
      data={data}
      projectId={projectId}
      costData={costHealthData?.cost ?? null}
      healthData={costHealthData?.health ?? null}
    />
  )
}

const AgentCollaborationPage = async ({ params }: Props) => {
  return (
    <div className="flex flex-col relative min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="sticky top-0 z-[10] border-b bg-background/80 backdrop-blur-xl">
        <div className="px-6 py-4 flex items-center gap-4">
          <Link href={`/projects/${params.projectId}/project-manager`}>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-muted">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 ring-1 ring-emerald-500/30">
              <Bot className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Agent Collaboration</h1>
              <p className="text-xs text-muted-foreground">
                Multi-agent autonomous team coordination
              </p>
            </div>
          </div>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center flex-1 py-32">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500/60" />
              <p className="text-sm text-muted-foreground">Initializing agent swarm...</p>
            </div>
          </div>
        }
      >
        <AgentDashboardContent projectId={params.projectId} />
      </Suspense>
    </div>
  )
}

export default AgentCollaborationPage
