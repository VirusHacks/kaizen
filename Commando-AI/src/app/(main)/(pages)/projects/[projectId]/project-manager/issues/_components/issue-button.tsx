'use client'

import IssueForm from '@/components/forms/issue-form'
import CustomModal from '@/components/global/custom-modal'
import { Button } from '@/components/ui/button'
import { useModal } from '@/providers/modal-provider'
import { Plus } from 'lucide-react'
import React from 'react'

type Props = {
  projectId: string
}

const IssueButton = ({ projectId }: Props) => {
  const { setOpen } = useModal()

  const handleClick = () => {
    setOpen(
      <CustomModal
        title="Create New Issue"
        subheading="Add a new task, bug, or story to track work."
      >
        <IssueForm projectId={projectId} />
      </CustomModal>
    )
  }

  return (
    <Button size="icon" onClick={handleClick}>
      <Plus />
    </Button>
  )
}

export default IssueButton
