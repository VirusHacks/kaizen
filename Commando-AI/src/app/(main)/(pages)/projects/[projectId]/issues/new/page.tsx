import React from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import IssueForm from '@/components/forms/issue-form'
import { getProjectById } from '../../../_actions/project-actions'
import { notFound } from 'next/navigation'

type Props = {
  params: { projectId: string }
}

const NewIssuePage = async ({ params }: Props) => {
  const { data: project, error } = await getProjectById(params.projectId)

  if (error || !project) {
    notFound()
  }

  return (
    <div className="flex flex-col relative">
      <div className="sticky top-0 z-[10] p-6 bg-background/50 backdrop-blur-lg border-b">
        <div className="flex items-center gap-4">
          <Link href={`/projects/${params.projectId}/issues`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">New Issue</h1>
              <Badge variant="secondary" className="font-mono text-sm">
                {project.key}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">{project.name}</p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-2xl mx-auto w-full">
        <IssueForm 
          projectId={params.projectId}
          title="Create Issue"
          subTitle="Add a new task, bug, or story to track work."
        />
      </div>
    </div>
  )
}

export default NewIssuePage
