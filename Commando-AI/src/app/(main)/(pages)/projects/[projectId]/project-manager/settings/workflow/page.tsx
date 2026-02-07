import React, { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import WorkflowEditor from './_components/workflow-editor'

type Props = {
  params: { projectId: string }
}

const WorkflowSettingsPage = ({ params }: Props) => {
  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <Suspense
        fallback={
          <div className="flex items-center justify-center flex-1 py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <WorkflowEditor projectId={params.projectId} />
      </Suspense>
    </div>
  )
}

export default WorkflowSettingsPage
