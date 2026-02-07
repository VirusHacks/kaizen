'use client'

import React, { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2 } from 'lucide-react'
import { runPlanningCycle } from '../_actions/resource-actions'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type Props = {
  projectId: string
}

const PlanningCycleButton = ({ projectId }: Props) => {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleRun = () => {
    startTransition(async () => {
      const result = await runPlanningCycle(projectId)
      if (result.success) {
        toast.success(
          `Planning cycle complete — ${result.recommendationCount ?? 0} recommendation${
            (result.recommendationCount ?? 0) !== 1 ? 's' : ''
          } generated`
        )
        router.refresh()
      } else {
        toast.error(result.error || 'Planning cycle failed')
      }
    })
  }

  return (
    <Button
      onClick={handleRun}
      disabled={isPending}
      size="sm"
      className="gap-1.5 h-8 text-xs bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-sm"
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
      {isPending ? 'Running...' : 'Run Planning Cycle'}
    </Button>
  )
}

export default PlanningCycleButton
