import React, { Suspense } from 'react'
import { getProjectById } from '../../_actions/project-actions'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DollarSign, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { getResourcePlanningData } from '../project-manager/resource-planning/_actions/resource-actions'
import FinanceDashboardClient from './_components/finance-dashboard-client'

type Props = {
  params: { projectId: string }
}

const FinanceDashboardContent = async ({ projectId }: { projectId: string }) => {
  const result = await getResourcePlanningData(projectId)
  if (result.error || !result.data) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No resource planning data available yet.
      </div>
    )
  }
  return <FinanceDashboardClient data={result.data} />
}

const FinanceDashboard = async ({ params }: Props) => {
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
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
              <DollarSign className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">Finance & HR Dashboard</h1>
                <Badge variant="secondary" className="font-mono text-sm">
                  {project.key}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                {project.name} — Cost efficiency & burnout risk monitoring
              </p>
            </div>
          </div>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center flex-1 py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <FinanceDashboardContent projectId={params.projectId} />
      </Suspense>
    </div>
  )
}

export default FinanceDashboard
