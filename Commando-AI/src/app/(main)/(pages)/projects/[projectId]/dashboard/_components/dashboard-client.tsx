'use client'

import React from 'react'
import { DashboardData } from '../_actions/dashboard-actions'
import ProjectSummaryCard from './project-summary-card'
import TeamOverviewCard from './team-overview-card'
import IssueStatsCard from './issue-stats-card'
import SprintCard from './sprint-card'
import BacklogPreviewCard from './backlog-preview-card'
import BoardPreviewCard from './board-preview-card'
import TimelinePreviewCard from './timeline-preview-card'
import ActivityFeedCard from './activity-feed-card'
import AIProjectDashboardCard from './ai-project-dashboard-card'

type Props = {
  data: DashboardData
}

const DashboardClient = ({ data }: Props) => {
  return (
    <div className="p-6 space-y-6">
      {/* Row 1: Project Summary + Team Overview + AI Insights */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ProjectSummaryCard project={data.project} />
        <TeamOverviewCard
          projectId={data.project.id}
          totalCount={data.team.totalCount}
          members={data.team.members}
        />
        <AIProjectDashboardCard
          projectId={data.project.id}
          projectKey={data.project.key}
          projectName={data.project.name}
        />
      </div>

      {/* Row 2: Issue Stats + Active Sprint */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <IssueStatsCard
          projectId={data.project.id}
          stats={data.issueStats}
        />
        <SprintCard
          projectId={data.project.id}
          sprint={data.sprintProgress}
        />
      </div>

      {/* Row 3: Board + Backlog + Timeline */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <BoardPreviewCard
          projectId={data.project.id}
          snapshot={data.boardSnapshot}
        />
        <BacklogPreviewCard
          projectId={data.project.id}
          projectKey={data.project.key}
          totalCount={data.backlog.totalCount}
          issues={data.backlog.preview}
        />
        <TimelinePreviewCard
          projectId={data.project.id}
          projectKey={data.project.key}
          issues={data.timeline.upcomingIssues}
        />
      </div>

      {/* Row 4: Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <ActivityFeedCard
          projectId={data.project.id}
          projectKey={data.project.key}
          activities={data.recentActivity}
        />
      </div>
    </div>
  )
}

export default DashboardClient
