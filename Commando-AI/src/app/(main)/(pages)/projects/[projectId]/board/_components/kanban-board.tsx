import React from 'react'
import { getProjectIssues } from '../../issues/_actions/issue-actions'
import { getProjectWorkflow } from '../../settings/workflow/_actions/workflow-actions'
import { LayoutGrid } from 'lucide-react'
import KanbanBoardClient from './kanban-board-client'

type Props = {
  projectId: string
}

const KanbanBoard = async ({ projectId }: Props) => {
  const [issuesResult, workflowResult] = await Promise.all([
    getProjectIssues(projectId),
    getProjectWorkflow(projectId),
  ])

  const { data: issues, error, project } = issuesResult

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-20 text-muted-foreground">
        <p>Failed to load board</p>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  if (!issues || issues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-20 text-muted-foreground">
        <LayoutGrid className="h-12 w-12 opacity-50 mb-4" />
        <p>No issues to display</p>
        <p className="text-sm text-center max-w-md mt-2">
          Create issues in the Issues tab to see them on the board.
        </p>
      </div>
    )
  }

  // Build transition map from workflow
  const transitionMap: Record<string, string[]> = {}
  if (workflowResult.data) {
    workflowResult.data.statuses.forEach((status) => {
      transitionMap[status.status] = []
    })
    workflowResult.data.transitions.forEach((t) => {
      const fromStatus = t.fromStatus.status
      const toStatus = t.toStatus.status
      if (!transitionMap[fromStatus]) {
        transitionMap[fromStatus] = []
      }
      transitionMap[fromStatus].push(toStatus)
    })
  }

  return (
    <KanbanBoardClient
      initialIssues={issues}
      projectId={projectId}
      projectKey={project?.key || ''}
      allowedTransitions={transitionMap}
    />
  )
}

export default KanbanBoard
