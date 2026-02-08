'use client'

import React from 'react'
import { DashboardData } from '../_actions/dashboard-actions'
import TeamOverviewCard from './team-overview-card'
import IssueStatsCard from './issue-stats-card'
import SprintCard from './sprint-card'
import BacklogPreviewCard from './backlog-preview-card'
import BoardPreviewCard from './board-preview-card'
import TimelinePreviewCard from './timeline-preview-card'
import ActivityFeedCard from './activity-feed-card'
import AIProjectDashboardCard from './ai-project-dashboard-card'
import AIFeaturesCard from './ai-features-card'

type Props = {
  data: DashboardData
}

const DashboardClient = ({ data }: Props) => {
  return (
    <div className="p-6 space-y-6">
      {/* Row 1: Sprint Progress + Issue Stats (most actionable info first) */}
      <div className="grid gap-6 md:grid-cols-2">
        <SprintCard
          projectId={data.project.id}
          sprint={data.sprintProgress}
        />
        <IssueStatsCard
          projectId={data.project.id}
          stats={data.issueStats}
        />
      </div>

      {/* Row 2: Team Overview + AI Actions */}
      <div className="grid gap-6 md:grid-cols-2">
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

      {/* AI Features Section */}
      <AIFeaturesCard projectId={data.project.id} />

      {/* Row 3: Board + Backlog + Timeline */}
      <div className="grid gap-6 md:grid-cols-3">
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

      {/* Row 4: Recent Activity (full width) */}
      <ActivityFeedCard
        projectId={data.project.id}
        projectKey={data.project.key}
        activities={data.recentActivity}
      />
    </div>
  )
}

export default DashboardClient
