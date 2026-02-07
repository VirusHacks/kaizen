import React, { Suspense } from 'react'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import IssueButton from './_components/issue-button'
import IssuesList from './_components'
import { getProjectById } from '../../_actions/project-actions'
import { notFound } from 'next/navigation'

type Props = {
  params: { projectId: string }
}

const IssuesPage = async ({ params }: Props) => {
  const { data: project, error } = await getProjectById(params.projectId)

  if (error || !project) {
    notFound()
  }

  return (
    <div className="flex flex-col relative">
      <div className="sticky top-0 z-[10] p-6 bg-background/50 backdrop-blur-lg border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/projects/${params.projectId}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">Issues</h1>
                <Badge variant="secondary" className="font-mono text-sm">
                  {project.key}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">{project.name}</p>
            </div>
          </div>
          <IssueButton projectId={params.projectId} />
        </div>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center mt-28">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <IssuesList projectId={params.projectId} />
      </Suspense>
    </div>
  )
}

export default IssuesPage
