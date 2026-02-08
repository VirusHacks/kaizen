'use client'

import React, { useState, useTransition } from 'react'
import {
  Bot,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Shield,
  Zap,
  Activity,
  Users,
  AlertTriangle,
  Clock,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Send,
  Brain,
  Target,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  triggerPlanningCycle,
  handleDecisionReview,
  toggleAgentStatus,
  triggerAgentThink,
} from '../_actions/agent-actions'
import type { AgentDecisionStatus } from '@prisma/client'

// ==========================================
// Types
// ==========================================

type AgentProfile = {
  id: string
  userId: string
  agentType: string
  status: string
  trustScore: number
  decisionsProposed: number
  decisionsAccepted: number
  totalInteractions: number
  lastRunAt: string | null
  currentState: Record<string, unknown>
  createdAt: string
}

type ActivityItem = {
  id: string
  type: 'message'
  timestamp: string
  fromAgent: { id: string; type: string; userId: string }
  toAgent: { id: string; type: string; userId: string } | null
  messageType: string
  subject: string
  payload: Record<string, unknown>
  status: string
  priority: number
  threadId: string | null
}

type PendingApproval = {
  id: string
  agentId: string
  agentType: string
  agentUserId: string
  decisionType: string
  status: AgentDecisionStatus
  title: string
  description: string
  reasoning: string
  confidence: number
  actionPayload: Record<string, unknown>
  impactEstimate: Record<string, unknown>
  createdAt: string
}

type DecidedItem = {
  id: string
  agentType: string
  decisionType: string
  status: AgentDecisionStatus
  title: string
  confidence: number
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
}

type DashboardData = {
  agents: AgentProfile[]
  activityFeed: ActivityItem[]
  pendingApprovals: PendingApproval[]
  decidedHistory: DecidedItem[]
  messageTypeStats: Record<string, number>
  summary: {
    totalAgents: number
    activeAgents: number
    pendingApprovalCount: number
    totalMessages: number
    avgTrustScore: number
  }
}

type Props = {
  data: DashboardData
  projectId: string
}

// ==========================================
// Helper Functions
// ==========================================

const agentTypeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  DEVELOPER: { icon: Users, color: 'text-blue-500', label: 'Developer' },
  MANAGER: { icon: Shield, color: 'text-purple-500', label: 'Manager' },
  OPTIMIZER: { icon: Target, color: 'text-amber-500', label: 'Optimizer' },
  QA: { icon: CheckCircle2, color: 'text-green-500', label: 'QA' },
  SCHEDULER: { icon: Clock, color: 'text-cyan-500', label: 'Scheduler' },
}

const messageTypeColors: Record<string, string> = {
  HELP_REQUEST: 'bg-red-500/10 text-red-400 border-red-500/20',
  TASK_OFFER: 'bg-green-500/10 text-green-400 border-green-500/20',
  NEGOTIATION_PROPOSAL: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  NEGOTIATION_RESPONSE: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  STATUS_UPDATE: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ALERT: 'bg-red-500/10 text-red-400 border-red-500/20',
  BROADCAST: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  APPROVAL_REQUEST: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  APPROVAL_RESPONSE: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  PLANNING_TRIGGER: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const past = new Date(dateStr).getTime()
  const diffMs = now - past
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}

// ==========================================
// Main Dashboard Component
// ==========================================

export default function AgentDashboardClient({ data, projectId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [expandedDecision, setExpandedDecision] = useState<string | null>(null)
  const [cycleRunning, setCycleRunning] = useState(false)

  const handlePlanningCycle = () => {
    console.log('[CLIENT] handlePlanningCycle called, projectId:', projectId)
    setCycleRunning(true)
    startTransition(async () => {
      try {
        console.log('[CLIENT] Calling triggerPlanningCycle...')
        const result = await triggerPlanningCycle(projectId)
        console.log('[CLIENT] Result:', result)
        if (result.error) {
          toast.error('Planning cycle failed', { description: result.error })
        } else if (result.results && result.results.length > 0) {
          const totalActions = result.results.reduce((sum, r) => sum + (r.actionsCount || 0), 0)
          const errors = result.results.filter(r => r.error).length
          toast.success(`Planning cycle complete!`, {
            description: `${result.results.length} agents ran, ${totalActions} actions proposed${errors > 0 ? `, ${errors} errors` : ''}. Refreshing...`,
            duration: 5000,
          })
          // Reload to show new data
          setTimeout(() => window.location.reload(), 1500)
        } else {
          toast.info('Planning cycle complete', {
            description: 'No actions were proposed by agents.',
          })
        }
      } catch (err: any) {
        console.error('[CLIENT] Error:', err)
        toast.error('Failed to trigger planning cycle', { description: err.message })
      } finally {
        setCycleRunning(false)
      }
    })
  }

  const handleApprove = (decisionId: string) => {
    startTransition(async () => {
      try {
        await handleDecisionReview(decisionId, true)
        toast.success('Decision approved')
      } catch {
        toast.error('Failed to approve decision')
      }
    })
  }

  const handleReject = (decisionId: string) => {
    startTransition(async () => {
      try {
        await handleDecisionReview(decisionId, false)
        toast.success('Decision rejected')
      } catch {
        toast.error('Failed to reject decision')
      }
    })
  }

  const handleToggleAgent = (agentId: string) => {
    startTransition(async () => {
      try {
        const result = await toggleAgentStatus(agentId)
        toast.success(`Agent ${result.status === 'ACTIVE' ? 'activated' : 'paused'}`)
      } catch {
        toast.error('Failed to toggle agent')
      }
    })
  }

  const handleRunAgent = (agentId: string) => {
    startTransition(async () => {
      try {
        await triggerAgentThink(agentId, projectId)
        toast.success('Agent think cycle triggered')
      } catch {
        toast.error('Failed to trigger agent')
      }
    })
  }

  return (
    <div className="px-6 py-6 space-y-6 max-w-[1400px] mx-auto w-full">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard
          icon={Bot}
          label="Active Agents"
          value={`${data.summary.activeAgents}/${data.summary.totalAgents}`}
          color="text-emerald-500"
        />
        <StatCard
          icon={MessageSquare}
          label="Messages"
          value={data.summary.totalMessages}
          color="text-blue-500"
        />
        <StatCard
          icon={AlertTriangle}
          label="Pending Approvals"
          value={data.summary.pendingApprovalCount}
          color={data.summary.pendingApprovalCount > 0 ? 'text-amber-500' : 'text-muted-foreground'}
        />
        <StatCard
          icon={Shield}
          label="Avg Trust"
          value={`${(data.summary.avgTrustScore * 100).toFixed(0)}%`}
          color="text-purple-500"
        />
        <div className="flex items-center">
          <Button
            onClick={handlePlanningCycle}
            disabled={isPending || cycleRunning}
            className="w-full h-full min-h-[72px] bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg disabled:opacity-70"
          >
            <div className="flex flex-col items-center gap-1">
              {cycleRunning ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-xs font-medium">Running Agents...</span>
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5" />
                  <span className="text-xs font-medium">Run Planning Cycle</span>
                </>
              )}
            </div>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Agent Roster + Approval Queue */}
        <div className="lg:col-span-1 space-y-6">
          {/* Agent Roster */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Bot className="h-4 w-4 text-emerald-500" />
                Agent Roster
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.agents.map(agent => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onToggle={handleToggleAgent}
                  onRun={handleRunAgent}
                  isPending={isPending}
                />
              ))}
              {data.agents.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No agents initialized yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* Message Stats */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                Communication Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(data.messageTypeStats).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${messageTypeColors[type] ?? 'bg-muted'}`}
                    >
                      {type.replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-xs font-mono text-muted-foreground">{count}</span>
                  </div>
                ))}
                {Object.keys(data.messageTypeStats).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No messages yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center: Activity Feed */}
        <div className="lg:col-span-1">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Send className="h-4 w-4 text-blue-500" />
                Agent Activity Feed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {data.activityFeed.map(item => (
                  <ActivityFeedItem key={item.id} item={item} />
                ))}
                {data.activityFeed.length === 0 && (
                  <div className="text-center py-12 space-y-3">
                    <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                    <p className="text-xs text-muted-foreground">
                      No agent activity yet. Run a planning cycle to start.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Approval Queue + Decision History */}
        <div className="lg:col-span-1 space-y-6">
          {/* Pending Approvals */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Brain className="h-4 w-4 text-amber-500" />
                Pending Approvals
                {data.pendingApprovals.length > 0 && (
                  <Badge variant="destructive" className="ml-auto text-[10px]">
                    {data.pendingApprovals.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.pendingApprovals.map(decision => (
                <DecisionCard
                  key={decision.id}
                  decision={decision}
                  expanded={expandedDecision === decision.id}
                  onToggle={() =>
                    setExpandedDecision(
                      expandedDecision === decision.id ? null : decision.id
                    )
                  }
                  onApprove={() => handleApprove(decision.id)}
                  onReject={() => handleReject(decision.id)}
                  isPending={isPending}
                />
              ))}
              {data.pendingApprovals.length === 0 && (
                <div className="text-center py-8 space-y-2">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500/30 mx-auto" />
                  <p className="text-xs text-muted-foreground">
                    No pending approvals
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Decision History */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-muted-foreground" />
                Decision History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {data.decidedHistory.map(d => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between gap-2 py-1.5 border-b border-border/30 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{d.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {d.agentType} · {d.decisionType.replace(/_/g, ' ')} · {timeAgo(d.createdAt)}
                      </p>
                    </div>
                    <DecisionStatusBadge status={d.status} />
                  </div>
                ))}
                {data.decidedHistory.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No decisions yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// Sub-Components
// ==========================================

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  color: string
}) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-muted/50 ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-lg font-bold tracking-tight">{value}</p>
          <p className="text-[10px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function AgentCard({
  agent,
  onToggle,
  onRun,
  isPending,
}: {
  agent: AgentProfile
  onToggle: (id: string) => void
  onRun: (id: string) => void
  isPending: boolean
}) {
  const config = agentTypeConfig[agent.agentType] ?? agentTypeConfig.DEVELOPER
  const Icon = config.icon
  const isActive = agent.status === 'ACTIVE'
  const state = agent.currentState as { mood?: string; activeGoals?: string[] } | null

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
        isActive
          ? 'border-border/50 bg-background/50'
          : 'border-border/30 bg-muted/30 opacity-60'
      }`}
    >
      <div className={`p-1.5 rounded-md bg-muted/50 ${config.color}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium">{config.label}</span>
          <Badge
            variant="outline"
            className={`text-[9px] px-1 py-0 ${
              isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-muted'
            }`}
          >
            {agent.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-muted-foreground">
            Trust: {(agent.trustScore * 100).toFixed(0)}%
          </span>
          <span className="text-[10px] text-muted-foreground">·</span>
          <span className="text-[10px] text-muted-foreground">
            {agent.totalInteractions} runs
          </span>
          {state?.mood && (
            <>
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className="text-[10px] text-muted-foreground capitalize">{state.mood}</span>
            </>
          )}
        </div>
        {agent.lastRunAt && (
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
            Last run: {timeAgo(agent.lastRunAt)}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onRun(agent.id)}
          disabled={isPending || !isActive}
          title="Run think cycle"
        >
          <Play className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onToggle(agent.id)}
          disabled={isPending}
          title={isActive ? 'Pause agent' : 'Activate agent'}
        >
          {isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 text-emerald-500" />}
        </Button>
      </div>
    </div>
  )
}

function ActivityFeedItem({ item }: { item: ActivityItem }) {
  const fromConfig = agentTypeConfig[item.fromAgent.type] ?? agentTypeConfig.DEVELOPER
  const FromIcon = fromConfig.icon

  return (
    <div className="flex gap-2.5 p-2.5 rounded-lg border border-border/30 bg-background/30 hover:bg-background/50 transition-colors">
      <div className={`p-1.5 rounded-md bg-muted/50 flex-shrink-0 ${fromConfig.color}`}>
        <FromIcon className="h-3 w-3" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-medium">{fromConfig.label}</span>
          <span className="text-[10px] text-muted-foreground">→</span>
          {item.toAgent ? (
            <span className="text-[10px] font-medium">
              {agentTypeConfig[item.toAgent.type]?.label ?? item.toAgent.type}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground italic">broadcast</span>
          )}
          <Badge
            variant="outline"
            className={`text-[9px] px-1 py-0 ml-auto ${messageTypeColors[item.messageType] ?? 'bg-muted'}`}
          >
            {item.messageType.replace(/_/g, ' ')}
          </Badge>
        </div>
        <p className="text-xs mt-1 text-foreground/80">{item.subject}</p>
        <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(item.timestamp)}</p>
      </div>
    </div>
  )
}

function DecisionCard({
  decision,
  expanded,
  onToggle,
  onApprove,
  onReject,
  isPending,
}: {
  decision: PendingApproval
  expanded: boolean
  onToggle: () => void
  onApprove: () => void
  onReject: () => void
  isPending: boolean
}) {
  const agentConfig = agentTypeConfig[decision.agentType] ?? agentTypeConfig.DEVELOPER
  const impact = decision.impactEstimate as {
    deliveryChange?: number
    costChange?: number
    burnoutChange?: number
  }

  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
      <div className="flex items-start gap-2 cursor-pointer" onClick={onToggle}>
        <div className="mt-0.5">
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className="text-[9px] px-1 py-0">
              {decision.decisionType.replace(/_/g, ' ')}
            </Badge>
            <Badge variant="outline" className={`text-[9px] px-1 py-0 ${agentConfig.color}`}>
              {agentConfig.label}
            </Badge>
            <span className="text-[10px] text-muted-foreground ml-auto">
              {(decision.confidence * 100).toFixed(0)}% conf
            </span>
          </div>
          <p className="text-xs font-medium mt-1">{decision.title}</p>
        </div>
      </div>

      {expanded && (
        <div className="pl-5 space-y-2">
          <p className="text-xs text-muted-foreground">{decision.description}</p>

          <div className="bg-muted/30 rounded-md p-2">
            <p className="text-[10px] font-medium text-muted-foreground mb-1">Agent Reasoning:</p>
            <p className="text-[11px] text-foreground/70 leading-relaxed">
              {decision.reasoning}
            </p>
          </div>

          {/* Impact estimate */}
          <div className="flex gap-3">
            {impact.deliveryChange !== undefined && (
              <div className="text-[10px]">
                <span className="text-muted-foreground">Delivery: </span>
                <span className={impact.deliveryChange > 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {impact.deliveryChange > 0 ? '+' : ''}
                  {impact.deliveryChange}%
                </span>
              </div>
            )}
            {impact.costChange !== undefined && (
              <div className="text-[10px]">
                <span className="text-muted-foreground">Cost: </span>
                <span className={impact.costChange <= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {impact.costChange > 0 ? '+' : ''}
                  {impact.costChange}%
                </span>
              </div>
            )}
            {impact.burnoutChange !== undefined && (
              <div className="text-[10px]">
                <span className="text-muted-foreground">Burnout: </span>
                <span className={impact.burnoutChange <= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {impact.burnoutChange > 0 ? '+' : ''}
                  {impact.burnoutChange}%
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 flex-1"
              onClick={onApprove}
              disabled={isPending}
            >
              <ThumbsUp className="h-3 w-3 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 flex-1"
              onClick={onReject}
              disabled={isPending}
            >
              <ThumbsDown className="h-3 w-3 mr-1" />
              Reject
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function DecisionStatusBadge({ status }: { status: AgentDecisionStatus }) {
  const config: Record<string, { className: string; icon: React.ElementType }> = {
    APPROVED_BY_HUMAN: { className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
    REJECTED_BY_HUMAN: { className: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle },
    AUTO_EXECUTED: { className: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Zap },
    PROPOSED: { className: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Clock },
    APPROVED_BY_AGENT: { className: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: Bot },
    PENDING_HUMAN: { className: 'bg-orange-500/10 text-orange-400 border-orange-500/20', icon: Clock },
    EXPIRED: { className: 'bg-muted text-muted-foreground', icon: Clock },
  }

  const c = config[status] ?? config.PROPOSED
  const Icon = c.icon

  return (
    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 gap-1 ${c.className}`}>
      <Icon className="h-2.5 w-2.5" />
      {status.replace(/_/g, ' ')}
    </Badge>
  )
}
