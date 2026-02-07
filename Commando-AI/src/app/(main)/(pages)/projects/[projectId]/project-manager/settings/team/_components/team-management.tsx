import React from 'react'
import { getProjectMembers } from '../_actions/team-actions'
import { getProjectById } from '@/app/(main)/(pages)/projects/_actions/project-actions'
import { notFound } from 'next/navigation'
import TeamManagementClient from './team-management-client'

type Props = {
  projectId: string
}

const TeamManagement = async ({ projectId }: Props) => {
  const [membersResult, projectResult] = await Promise.all([
    getProjectMembers(projectId),
    getProjectById(projectId),
  ])

  if (projectResult.error || !projectResult.data) {
    notFound()
  }

  if (membersResult.error) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Failed to load team: {membersResult.error}
      </div>
    )
  }

  return (
    <TeamManagementClient
      projectId={projectId}
      projectName={projectResult.data.name}
      members={membersResult.data?.members || []}
      currentUserRole={membersResult.data?.currentUserRole || null}
      projectOwnerId={membersResult.data?.projectOwnerId || ''}
    />
  )
}

export default TeamManagement
