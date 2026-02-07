'use client'

import React, { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { AIAssigneeSuggestionModal, AIIconButton } from '@/components/ai'
import { suggestTaskAssignee } from '@/lib/ai/ai.actions'
import { updateIssue } from '../../_actions/issue-actions'

type Props = {
  issueId: string
  issueKey: string
  issueTitle: string
  projectId: string
}

export function AIAssigneeSuggestionButton({
  issueId,
  issueKey,
  issueTitle,
  projectId,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const handleFetchSuggestion = async () => {
    const result = await suggestTaskAssignee(issueId)
    if (result.error) {
      toast.error(result.error)
      return null
    }
    return result.data || null
  }

  const handleAssign = async (userId: string, userName: string) => {
    try {
      const result = await updateIssue(issueId, { assigneeId: userId })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`Assigned to ${userName}`)
      router.refresh()
    } catch {
      toast.error('Failed to assign issue')
    }
  }

  return (
    <>
      <AIIconButton
        onClick={() => setOpen(true)}
        tooltip="Get AI suggestion for assignee"
        variant="ghost"
      />

      <AIAssigneeSuggestionModal
        open={open}
        onOpenChange={setOpen}
        issueKey={issueKey}
        issueTitle={issueTitle}
        onFetchSuggestion={handleFetchSuggestion}
        onAssign={handleAssign}
      />
    </>
  )
}

export default AIAssigneeSuggestionButton
