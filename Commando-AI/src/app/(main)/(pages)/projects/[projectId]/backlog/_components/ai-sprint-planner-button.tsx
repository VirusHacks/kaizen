'use client'

import React, { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { AISprintPlannerModal, AIButton } from '@/components/ai'
import { planSprintWithAI } from '@/lib/ai/ai.actions'
import { moveIssueToSprint } from '../../sprints/_actions/sprint-actions'
import type { AISprintPlan } from '@/lib/ai/ai.types'

type Props = {
  projectId: string
  hasPlannedSprint: boolean
  plannedSprintId?: string
}

export function AISprintPlannerButton({
  projectId,
  hasPlannedSprint,
  plannedSprintId,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const handleFetchPlan = async () => {
    const result = await planSprintWithAI(projectId)
    if (result.error) {
      toast.error(result.error)
      return null
    }
    return result.data || null
  }

  const handleApply = async (plan: AISprintPlan, selectedTaskIds: string[]) => {
    if (!plannedSprintId) {
      toast.error('Please create a sprint first before adding tasks')
      return
    }

    let successCount = 0
    let errorCount = 0

    for (const taskId of selectedTaskIds) {
      try {
        const result = await moveIssueToSprint(taskId, plannedSprintId)
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
      toast.success(`Added ${successCount} issue${successCount !== 1 ? 's' : ''} to sprint`)
      router.refresh()
    }
    if (errorCount > 0) {
      toast.error(`Failed to add ${errorCount} issue${errorCount !== 1 ? 's' : ''}`)
    }
  }

  return (
    <>
      <AIButton
        onClick={() => setOpen(true)}
        variant="outline"
        tooltip="Get AI recommendations for your next sprint"
        disabled={!hasPlannedSprint}
      >
        Plan Sprint with AI
      </AIButton>

      <AISprintPlannerModal
        open={open}
        onOpenChange={setOpen}
        projectId={projectId}
        onFetchPlan={handleFetchPlan}
        onApply={handleApply}
      />
    </>
  )
}

export default AISprintPlannerButton
