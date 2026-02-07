import React, { Suspense } from 'react'
import { Loader2, Brain, ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getResourcePlanningData } from './_actions/resource-actions'
import ResourcePlanningClient from './_components/resource-planning-client'

type Props = {
  params: { projectId: string }
}

const ResourcePlanningContent = async ({ projectId }: { projectId: string }) => {
  const result = await getResourcePlanningData(projectId)
  if (result.error || !result.data) {
    if (result.error === 'Project not found or access denied') notFound()
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <Brain className="h-6 w-6 text-destructive" />
          </div>
          <p className="text-sm text-muted-foreground max-w-sm">
            {result.error || 'Failed to load resource planning data'}
          </p>
        </div>
      </div>
    )
  }
  return <ResourcePlanningClient data={result.data} />
}

const ResourcePlanningPage = async ({ params }: Props) => {
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 ring-1 ring-violet-500/30">
              <Brain className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Resource Planning</h1>
              <p className="text-xs text-muted-foreground">
                AI-powered allocation & delivery insights
              </p>
            </div>
          </div>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center flex-1 py-32">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500 mx-auto" />
              <p className="text-sm text-muted-foreground">Analyzing project state...</p>
            </div>
          </div>
        }
      >
        <ResourcePlanningContent projectId={params.projectId} />
      </Suspense>
    </div>
  )
}

export default ResourcePlanningPage
