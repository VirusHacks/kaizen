'use client'

import React, { useState } from 'react'
import { ResourcePlanningData } from '@/lib/resource-allocation/types'
import DeliveryConfidenceCard from './delivery-confidence-card'
import UtilizationHeatmap from './utilization-heatmap'
import DeliveryRisksCard from './delivery-risks-card'
import RecommendationsPanel from './recommendations-panel'
import ConfigPanel from './config-panel'
import AuditLogPanel from './audit-log-panel'
import PlanningCycleButton from './planning-cycle-button'
import ConfidenceHistoryChart from './confidence-history-chart'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Lightbulb,
  ClipboardList,
  Settings,
  Activity,
  Users,
  AlertTriangle,
  TrendingDown,
} from 'lucide-react'

type Props = {
  data: ResourcePlanningData
}

const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'recommendations', label: 'Recommendations', icon: Lightbulb },
  { id: 'audit', label: 'Audit Log', icon: ClipboardList },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const

type TabId = typeof tabs[number]['id']

const ResourcePlanningClient = ({ data }: Props) => {
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  const pendingCount = data.recommendations.filter((r: any) => r.status === 'PENDING').length
  const riskCount = data.state.risks.filter((r: any) => r.riskLevel === 'CRITICAL' || r.riskLevel === 'HIGH').length
  const overloadedCount = data.utilization.filter((u: any) => u.status === 'OVERLOADED').length

  return (
    <div className="flex-1">
      {/* Status strip with key metrics */}
      <div className="border-b bg-muted/30">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Project</span>
              <span className="text-sm font-semibold">{data.project.name}</span>
              <Badge variant="outline" className="text-xs font-mono px-1.5 py-0">
                {data.project.key}
              </Badge>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-4">
              {riskCount > 0 && (
                <div className="flex items-center gap-1.5 text-orange-500">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{riskCount} high risks</span>
                </div>
              )}
              {overloadedCount > 0 && (
                <div className="flex items-center gap-1.5 text-red-500">
                  <TrendingDown className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{overloadedCount} overloaded</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{data.utilization.length} members</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Activity className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{data.state.tasks.length} tasks</span>
              </div>
            </div>
          </div>
          <PlanningCycleButton projectId={data.project.id} />
        </div>
      </div>

      {/* Tab navigation */}
      <div className="border-b bg-background/60 backdrop-blur-sm">
        <div className="px-6 flex items-center gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  isActive
                    ? 'border-violet-500 text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.id === 'recommendations' && pendingCount > 0 && (
                  <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-violet-500 text-white text-[10px] font-bold">
                    {pendingCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Row 1: Confidence + Utilization */}
            <div className="grid gap-6 lg:grid-cols-5">
              <div className="lg:col-span-2">
                <DeliveryConfidenceCard
                  confidence={data.state.deliveryConfidence}
                  totalTasks={data.state.tasks.length}
                  doneTasks={data.state.tasks.filter((t: any) => t.status === 'DONE').length}
                  inProgressTasks={data.state.tasks.filter((t: any) => t.status === 'IN_PROGRESS').length}
                  overdueTasks={data.state.risks.filter((r: any) => r.reasons.some((rs: string) => rs.toLowerCase().includes('overdue'))).length}
                  activeSprint={data.state.activeSprint}
                />
              </div>
              <div className="lg:col-span-3">
                <UtilizationHeatmap utilization={data.utilization} />
              </div>
            </div>

            {/* Row 2: Risks + Confidence History */}
            <div className="grid gap-6 lg:grid-cols-2">
              <DeliveryRisksCard
                risks={data.state.risks}
                projectKey={data.project.key}
              />
              <ConfidenceHistoryChart history={data.deliveryConfidenceHistory} />
            </div>

            {/* Row 3: Pending Recommendations preview */}
            {pendingCount > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    <h3 className="text-sm font-semibold">Pending Recommendations</h3>
                    <Badge className="bg-violet-500/10 text-violet-600 hover:bg-violet-500/20 border-0 text-[10px]">
                      {pendingCount} pending
                    </Badge>
                  </div>
                  {pendingCount > 3 && (
                    <button
                      onClick={() => setActiveTab('recommendations')}
                      className="text-xs text-violet-500 hover:text-violet-600 font-medium"
                    >
                      View all →
                    </button>
                  )}
                </div>
                <RecommendationsPanel
                  recommendations={data.recommendations.filter((r: any) => r.status === 'PENDING').slice(0, 3)}
                  projectId={data.project.id}
                  compact
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div className="animate-in fade-in duration-300">
            <RecommendationsPanel
              recommendations={data.recommendations}
              projectId={data.project.id}
            />
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="animate-in fade-in duration-300">
            <AuditLogPanel projectId={data.project.id} />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="animate-in fade-in duration-300">
            <ConfigPanel projectId={data.project.id} config={data.config} />
          </div>
        )}
      </div>
    </div>
  )
}

export default ResourcePlanningClient
