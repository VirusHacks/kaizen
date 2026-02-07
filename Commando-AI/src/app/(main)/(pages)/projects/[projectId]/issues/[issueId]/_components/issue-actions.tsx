'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Archive, Edit, MoreHorizontal, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { archiveIssue } from '../../_actions/issue-actions'
import { useRouter } from 'next/navigation'
import { useModal } from '@/providers/modal-provider'
import CustomModal from '@/components/global/custom-modal'
import IssueForm from '@/components/forms/issue-form'
import { IssueType, IssueStatus, IssuePriority } from '@/lib/types'

type IssueData = {
  id: string
  title: string
  description: string | null
  type: IssueType
  status: IssueStatus
  priority: IssuePriority
  assigneeId: string | null
}

type Props = {
  issue: IssueData
  projectId: string
}

const IssueActions = ({ issue, projectId }: Props) => {
  const router = useRouter()
  const { setOpen } = useModal()

  const handleArchive = async () => {
    const result = await archiveIssue(issue.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(result.message)
      router.push(`/projects/${projectId}/issues`)
    }
  }

  const handleEdit = () => {
    setOpen(
      <CustomModal
        title="Edit Issue"
        subheading="Update issue details."
      >
        <IssueForm
          projectId={projectId}
          mode="edit"
          defaultValues={{
            id: issue.id,
            title: issue.title,
            description: issue.description || '',
            type: issue.type,
            status: issue.status,
            priority: issue.priority,
            assigneeId: issue.assigneeId,
          }}
        />
      </CustomModal>
    )
  }

  const handleAddSubtask = () => {
    setOpen(
      <CustomModal
        title="Add Subtask"
        subheading="Break down this issue into smaller tasks."
      >
        <IssueForm
          projectId={projectId}
          defaultValues={{
            type: 'SUBTASK',
            parentId: issue.id,
          }}
        />
      </CustomModal>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleAddSubtask}>
        <Plus className="h-4 w-4 mr-1" />
        Add Subtask
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleArchive} className="text-destructive">
            <Archive className="mr-2 h-4 w-4" />
            Archive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default IssueActions
