import React from 'react'
import { getProjectWorkflow } from '../_actions/workflow-actions'
import { getProjectById } from '@/app/(main)/(pages)/projects/_actions/project-actions'
import { notFound } from 'next/navigation'
import WorkflowEditorClient from './workflow-editor-client'

type Props = {
  projectId: string
}

const WorkflowEditor = async ({ projectId }: Props) => {
  const [workflowResult, projectResult] = await Promise.all([
    getProjectWorkflow(projectId),
    getProjectById(projectId),
  ])

  if (projectResult.error || !projectResult.data) {
    notFound()
  }

  if (workflowResult.error || !workflowResult.data) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Failed to load workflow: {workflowResult.error}
      </div>
    )
  }

  return (
    <WorkflowEditorClient
      workflow={workflowResult.data}
      projectId={projectId}
      projectName={projectResult.data.name}
    />
  )
}

export default WorkflowEditor
