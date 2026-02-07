import React from 'react'
import { getTimelineData } from '../_actions/timeline-actions'
import { notFound } from 'next/navigation'
import TimelineViewClient from './timeline-view-client'

type Props = {
  projectId: string
}

const TimelineView = async ({ projectId }: Props) => {
  const result = await getTimelineData(projectId)

  if (result.error || !result.data) {
    if (result.error === 'Project not found or access denied') {
      notFound()
    }
    return (
      <div className="p-6 text-center text-muted-foreground">
        Failed to load timeline: {result.error}
      </div>
    )
  }

  return (
    <TimelineViewClient
      projectId={projectId}
      projectName={result.data.project.name}
      projectKey={result.data.project.key}
      issues={result.data.issues}
      sprints={result.data.sprints}
      dateRange={result.data.dateRange}
    />
  )
}

export default TimelineView
