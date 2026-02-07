import React from 'react'
import { getBacklogIssues, getProjectSprints } from '../../sprints/_actions/sprint-actions'
import { Layers, ListTodo } from 'lucide-react'
import BacklogClient from './backlog-client'

type Props = {
  projectId: string
}

const BacklogView = async ({ projectId }: Props) => {
  const [backlogResult, sprintsResult] = await Promise.all([
    getBacklogIssues(projectId),
    getProjectSprints(projectId),
  ])

  if (backlogResult.error || sprintsResult.error) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-20 text-muted-foreground">
        <p>Failed to load backlog</p>
        <p className="text-sm">{backlogResult.error || sprintsResult.error}</p>
      </div>
    )
  }

  return (
    <BacklogClient
      initialBacklog={backlogResult.data || []}
      initialSprints={sprintsResult.data || []}
      projectId={projectId}
      projectKey={backlogResult.project?.key || sprintsResult.project?.key || ''}
    />
  )
}

export default BacklogView
