import React from 'react'
import { getProjectById } from '../../_actions/project-actions'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bug, ArrowLeft, FolderKanban } from 'lucide-react'
import Link from 'next/link'

type Props = {
  params: { projectId: string }
}

const QATesterDashboard = async ({ params }: Props) => {
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
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/10">
              <Bug className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">QA Tester Dashboard</h1>
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

      <div className="p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <FolderKanban className="h-16 w-16 text-muted-foreground/50" />
          <h2 className="text-2xl font-semibold">QA Tester Dashboard</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Welcome to the QA Tester Dashboard. This view is customized for quality assurance testers
            to track bugs, test cases, and ensure product quality.
          </p>
          <Badge variant="outline" className="mt-4">Coming Soon</Badge>
        </div>
      </div>
    </div>
  )
}

export default QATesterDashboard
