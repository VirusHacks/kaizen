'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2, FileText, TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react'
import { toast } from 'sonner'
import {
  AIProjectSummaryModal,
  AITaskGeneratorModal,
  AIButton,
  AIBadge,
} from '@/components/ai'
import { generateProjectSummary, generateTasksWithAI } from '@/lib/ai/ai.actions'
import { createIssue } from '../../issues/_actions/issue-actions'
import type { AIProjectSummary, AIGeneratedTask } from '@/lib/ai/ai.types'

type Props = {
  projectId: string
  projectKey: string
  projectName: string
}

export function AIProjectDashboardCard({
  projectId,
  projectKey,
  projectName,
}: Props) {
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [taskGenOpen, setTaskGenOpen] = useState(false)
  const [cachedSummary, setCachedSummary] = useState<AIProjectSummary | null>(null)

  const handleFetchSummary = async () => {
    const result = await generateProjectSummary(projectId)
    if (result.error) {
      toast.error(result.error)
      return null
    }
    if (result.data) {
      setCachedSummary(result.data)
    }
    return result.data || null
  }

  const handleGenerateTasks = async () => {
    const result = await generateTasksWithAI(projectId)
    if (result.error) {
      toast.error(result.error)
      return null
    }
    return result.data || null
  }

  const handleApplyTasks = async (tasks: AIGeneratedTask[]) => {
    let successCount = 0
    let errorCount = 0

    for (const task of tasks) {
      try {
        const result = await createIssue(projectId, {
          title: task.title,
          description: task.description || '',
          type: task.type as 'TASK' | 'STORY' | 'BUG' | 'EPIC' | 'SUBTASK',
          status: 'TODO' as const,
          priority: task.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
          assigneeId: task.suggestedAssigneeId || undefined,
        })
        if (result.error) {
          errorCount++
        } else {
          successCount++
        }
      } catch {
        errorCount++
      }
    }

    if (successCount > 0) {
      toast.success(`Created ${successCount} task${successCount !== 1 ? 's' : ''}`)
    }
    if (errorCount > 0) {
      toast.error(`Failed to create ${errorCount} task${errorCount !== 1 ? 's' : ''}`)
    }
  }

  return (
    <>
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Insights
          </CardTitle>
          <CardDescription>
            AI-powered analysis and task generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Summary Preview */}
          {cachedSummary && (
            <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Latest Summary</span>
                <AIBadge />
              </div>
              <p className="text-muted-foreground line-clamp-3">
                {cachedSummary.summary}
              </p>
              {cachedSummary.risks && cachedSummary.risks.length > 0 && (
                <div className="flex items-center gap-1 text-yellow-500">
                  <AlertTriangle className="h-3 w-3" />
                  <span className="text-xs">
                    {cachedSummary.risks.length} risk{cachedSummary.risks.length !== 1 ? 's' : ''} identified
                  </span>
                </div>
              )}
              {cachedSummary.recommendations && cachedSummary.recommendations.length > 0 && (
                <div className="flex items-center gap-1 text-primary">
                  <Lightbulb className="h-3 w-3" />
                  <span className="text-xs">
                    {cachedSummary.recommendations.length} recommendation{cachedSummary.recommendations.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            <AIButton
              onClick={() => setSummaryOpen(true)}
              variant="outline"
              className="w-full justify-start"
              showSparkles={true}
            >
              <FileText className="h-4 w-4 mr-2" />
              View AI Summary
            </AIButton>

            <AIButton
              onClick={() => setTaskGenOpen(true)}
              variant="outline"
              className="w-full justify-start"
              showSparkles={true}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Generate Tasks
            </AIButton>
          </div>
        </CardContent>
      </Card>

      {/* AI Project Summary Modal */}
      <AIProjectSummaryModal
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        projectId={projectId}
        projectName={projectName}
        onFetchSummary={handleFetchSummary}
      />

      {/* AI Task Generator Modal */}
      <AITaskGeneratorModal
        open={taskGenOpen}
        onOpenChange={setTaskGenOpen}
        projectId={projectId}
        projectKey={projectKey}
        onGenerate={handleGenerateTasks}
        onApply={handleApplyTasks}
      />
    </>
  )
}

export default AIProjectDashboardCard
