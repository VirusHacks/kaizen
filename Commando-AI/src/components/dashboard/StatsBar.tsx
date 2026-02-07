'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Mail, Calendar, FolderOpen, FileText, Workflow, Activity, TrendingUp, TrendingDown } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { MiniChart } from './MiniChart'

interface StatsBarProps {
  stats: {
    unreadEmails: number
    todayEvents: number
    recentFiles: number
    notionPages: number
    totalWorkflows: number
    activeWorkflows: number
  }
  isLoading?: boolean
  previousStats?: StatsBarProps['stats']
}

export function StatsBar({ stats, isLoading, previousStats }: StatsBarProps) {
  const getTrend = (current: number, previous?: number) => {
    if (!previous) return null
    if (current > previous) return { direction: 'up', value: current - previous }
    if (current < previous) return { direction: 'down', value: previous - current }
    return null
  }
  const statItems = [
    {
      label: 'Unread Emails',
      value: stats.unreadEmails,
      previous: previousStats?.unreadEmails,
      icon: Mail,
      href: 'https://mail.google.com',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: "Today's Events",
      value: stats.todayEvents,
      previous: previousStats?.todayEvents,
      icon: Calendar,
      href: 'https://calendar.google.com',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Recent Files',
      value: stats.recentFiles,
      previous: previousStats?.recentFiles,
      icon: FolderOpen,
      href: 'https://drive.google.com',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      label: 'Notion Pages',
      value: stats.notionPages,
      previous: previousStats?.notionPages,
      icon: FileText,
      href: 'https://notion.so',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Active Workflows',
      value: stats.activeWorkflows,
      previous: previousStats?.activeWorkflows,
      icon: Workflow,
      href: '/workflows',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      label: 'Total Workflows',
      value: stats.totalWorkflows,
      previous: previousStats?.totalWorkflows,
      icon: Activity,
      href: '/workflows',
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10',
    },
  ]

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statItems.map((item, index) => (
          <Card key={index} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-12 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
      {statItems.map((item) => {
        const Icon = item.icon
        const isExternal = item.href.startsWith('http')
        const trend = getTrend(item.value, item.previous)

        return (
          <Link
            key={item.label}
            href={item.href}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
          >
            <Card className="hover:bg-accent/50 hover:scale-105 transition-all cursor-pointer h-full group">
              <CardContent className="p-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <div className={cn('p-1.5 rounded-md transition-colors', item.bgColor, 'group-hover:scale-110')}>
                    <Icon className={cn('h-3.5 w-3.5', item.color)} />
                  </div>
                  <div className="flex items-center gap-1">
                    {trend && (
                      <div className={cn(
                        'flex items-center gap-0.5 text-[0.65rem]',
                        trend.direction === 'up' ? 'text-green-500' : 'text-red-500'
                      )}>
                        {trend.direction === 'up' ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        <span>{trend.value}</span>
                      </div>
                    )}
                    {item.value > 0 && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                        {item.value}
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm font-semibold leading-tight">{item.value}</p>
                <p className="text-xs text-muted-foreground truncate leading-tight mb-1">{item.label}</p>
                {/* Mini chart showing trend */}
                {item.value > 0 && (
                  <MiniChart
                    data={[
                      item.previous || item.value * 0.8,
                      item.value * 0.9,
                      item.value,
                    ]}
                    color={item.bgColor.replace('bg-', 'bg-').replace('/10', '')}
                    height={12}
                    className="opacity-60"
                  />
                )}
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

