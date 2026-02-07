import React, { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import BacklogView from './_components/backlog-view'

type Props = {
  params: { projectId: string }
}

const BacklogPage = ({ params }: Props) => {
  return (
    <div className="flex flex-col h-full w-full">
      <Suspense
        fallback={
          <div className="flex items-center justify-center flex-1 py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <BacklogView projectId={params.projectId} />
      </Suspense>
    </div>
  )
}

export default BacklogPage
