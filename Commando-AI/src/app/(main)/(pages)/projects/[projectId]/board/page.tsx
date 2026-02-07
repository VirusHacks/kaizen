import React, { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import KanbanBoard from './_components/kanban-board'

type Props = {
  params: { projectId: string }
}

const BoardPage = ({ params }: Props) => {
  return (
    <div className="flex flex-col h-full w-full">
      <div className="sticky top-0 z-[10] p-6 bg-background/50 backdrop-blur-lg border-b">
        <h1 className="text-2xl font-semibold">Kanban Board</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Drag and drop issues to change their status
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center flex-1 py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <KanbanBoard projectId={params.projectId} />
      </Suspense>
    </div>
  )
}

export default BoardPage
