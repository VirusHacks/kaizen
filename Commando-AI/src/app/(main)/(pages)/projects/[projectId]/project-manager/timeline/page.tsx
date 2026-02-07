import React, { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import TimelineView from './_components/timeline-view'

type Props = {
  params: { projectId: string }
}

const TimelinePage = ({ params }: Props) => {
  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <Suspense
        fallback={
          <div className="flex items-center justify-center flex-1 py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <TimelineView projectId={params.projectId} />
      </Suspense>
    </div>
  )
}

export default TimelinePage
