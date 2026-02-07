import React, { Suspense } from 'react'
import { Loader2, LayoutDashboard, ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getProjectDashboardData } from './_actions/dashboard-actions'
import DashboardClient from './_components/dashboard-client'

type Props = {
  params: { projectId: string }
}

const DashboardContent = async ({ projectId }: { projectId: string }) => {
  const result = await getProjectDashboardData(projectId)

  if (result.error || !result.data) {
    if (result.error === 'Project not found or access denied') {
      notFound()
    }
    return (
      <div className="p-6 text-center text-muted-foreground">
        Failed to load dashboard: {result.error}
      </div>
    )
  }

  return <DashboardClient data={result.data} />
}

const ProjectDashboardPage = async ({ params }: Props) => {
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
              <h1 className="text-xl font-semibold">Project Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Overview of project progress and activity
              </p>
            </div>
          </div>
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
  )
}

export default ProjectDashboardPage
