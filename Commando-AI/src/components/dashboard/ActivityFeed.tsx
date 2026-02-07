'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, Calendar, FolderOpen, FileText, Workflow, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface ActivityItem {
  id: string
  type: 'email' | 'calendar' | 'drive' | 'notion' | 'workflow'
  title: string
  description: string
  timestamp: string
  url?: string
  icon: React.ReactNode
  color: string
}

interface ActivityFeedProps {
  gmailData: any
  calendarData: any
  driveData: any
  notionData: any
  workflowsData: any
}

export function ActivityFeed({
  gmailData,
  calendarData,
  driveData,
  notionData,
  workflowsData,
}: ActivityFeedProps) {
  const activities: ActivityItem[] = []

  // Add Gmail activities
  if (gmailData?.success && gmailData.data?.emails && gmailData.data.emails.length > 0) {
    gmailData.data.emails.slice(0, 2).forEach((email: any) => {
      activities.push({
        id: `email-${email.id}`,
        type: 'email',
        title: email.subject || 'New Email',
        description: `From: ${email.from.split('<')[0].trim() || email.from}`,
        timestamp: email.date,
        url: `https://mail.google.com/mail/u/0/#inbox/${email.threadId}`,
        icon: <Mail className="h-3 w-3" />,
        color: 'text-blue-500 bg-blue-500/10',
      })
    })
  }

  // Add Calendar activities
  if (calendarData?.success && calendarData.data?.events && calendarData.data.events.length > 0) {
    calendarData.data.events.slice(0, 2).forEach((event: any) => {
      activities.push({
        id: `calendar-${event.id}`,
        type: 'calendar',
        title: event.summary,
        description: `Starts ${formatDistanceToNow(new Date(event.start), { addSuffix: true })}`,
        timestamp: event.start,
        url: event.htmlLink,
        icon: <Calendar className="h-3 w-3" />,
        color: 'text-green-500 bg-green-500/10',
      })
    })
  }

  // Add Drive activities
  if (driveData?.success && driveData.data?.files && driveData.data.files.length > 0) {
    driveData.data.files.slice(0, 2).forEach((file: any) => {
      activities.push({
        id: `drive-${file.id}`,
        type: 'drive',
        title: file.name,
        description: `Modified ${formatDistanceToNow(new Date(file.modifiedTime), { addSuffix: true })}`,
        timestamp: file.modifiedTime,
        url: file.webViewLink,
        icon: <FolderOpen className="h-3 w-3" />,
        color: 'text-yellow-500 bg-yellow-500/10',
      })
    })
  }

  // Add Notion activities
  if (notionData?.success && notionData.data?.pages && notionData.data.pages.length > 0) {
    notionData.data.pages.slice(0, 2).forEach((page: any) => {
      activities.push({
        id: `notion-${page.id}`,
        type: 'notion',
        title: page.title,
        description: `Edited ${formatDistanceToNow(new Date(page.lastEditedTime), { addSuffix: true })}`,
        timestamp: page.lastEditedTime,
        url: page.url,
        icon: <FileText className="h-3 w-3" />,
        color: 'text-purple-500 bg-purple-500/10',
      })
    })
  }

  // Sort by timestamp (most recent first)
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  if (activities.length === 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="flex-shrink-0 py-3 px-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Activity Feed
          </CardTitle>
          <CardDescription className="text-sm mt-0.5">Recent activity</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 px-4 pb-3">
          <div className="text-center py-4 text-sm text-muted-foreground">
            <Clock className="h-6 w-6 mx-auto mb-1 opacity-50" />
            <p>No recent activity</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-shrink-0 py-3 px-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Activity Feed
        </CardTitle>
        <CardDescription className="text-sm mt-0.5">Last 7 Days</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto pt-0 px-4 pb-3">
        <div className="space-y-1.5">
          {activities.slice(0, 6).map((activity, index) => (
            <a
              key={activity.id}
              href={activity.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'group flex items-start gap-2.5 p-2 rounded-lg border border-transparent hover:bg-accent/50 hover:border-primary/50 transition-all',
                index < activities.length - 1 && 'border-b border-border/30'
              )}
            >
              <div className={cn('flex-shrink-0 h-6 w-6 rounded flex items-center justify-center', activity.color)}>
                {activity.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{activity.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{activity.description}</p>
              </div>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

