'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Circle, Clock, Eye, CheckCircle2, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { changeIssueStatus } from '../../_actions/issue-actions'
import { useRouter } from 'next/navigation'
import { IssueStatus } from '@/lib/types'

const statusIcons: Record<IssueStatus, React.ReactNode> = {
  TODO: <Circle className="h-4 w-4 text-gray-400" />,
  IN_PROGRESS: <Clock className="h-4 w-4 text-blue-500" />,
  IN_REVIEW: <Eye className="h-4 w-4 text-yellow-500" />,
  DONE: <CheckCircle2 className="h-4 w-4 text-green-500" />,
}

const statusLabels: Record<IssueStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
}

const statusColors: Record<IssueStatus, string> = {
  TODO: 'bg-gray-500/10 hover:bg-gray-500/20 text-gray-500',
  IN_PROGRESS: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-500',
  IN_REVIEW: 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500',
  DONE: 'bg-green-500/10 hover:bg-green-500/20 text-green-500',
}

type Props = {
  issueId: string
  currentStatus: IssueStatus
}

const IssueStatusChanger = ({ issueId, currentStatus }: Props) => {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)

  const handleStatusChange = async (newStatus: IssueStatus) => {
    if (newStatus === currentStatus) return
    setIsLoading(true)

    try {
      const result = await changeIssueStatus(issueId, newStatus)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(result.message)
        router.refresh()
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={`w-full justify-between ${statusColors[currentStatus]}`}
          disabled={isLoading}
        >
          <span className="flex items-center gap-2">
            {statusIcons[currentStatus]}
            {statusLabels[currentStatus]}
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-full">
        {(Object.keys(statusLabels) as IssueStatus[]).map((status) => (
          <DropdownMenuItem
            key={status}
            onClick={() => handleStatusChange(status)}
            disabled={status === currentStatus}
            className="cursor-pointer"
          >
            <span className="flex items-center gap-2">
              {statusIcons[status]}
              {statusLabels[status]}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default IssueStatusChanger
