import React from 'react'
import { getProjectById } from '../../_actions/project-actions'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Code, ArrowLeft, FolderKanban } from 'lucide-react'
import Link from 'next/link'

type Props = {
  params: { projectId: string }
}

const DeveloperDashboard = async ({ params }: Props) => {
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
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
              <Code className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">Developer Dashboard</h1>
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
          <h2 className="text-2xl font-semibold">Developer Dashboard</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Welcome to the Developer Dashboard. This view is customized for developers to manage code,
            track technical tasks, and collaborate on development work.
          </p>
          <Badge variant="outline" className="mt-4">Coming Soon</Badge>
        </div>
      </div>
    </div>
  )
}

export default DeveloperDashboard
