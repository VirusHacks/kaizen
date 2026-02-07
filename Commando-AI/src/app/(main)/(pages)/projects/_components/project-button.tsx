'use client'

import ProjectForm from '@/components/forms/project-form'
import CustomModal from '@/components/global/custom-modal'
import { Button } from '@/components/ui/button'
import { useBilling } from '@/providers/billing-provider'
import { useModal } from '@/providers/modal-provider'
import { Plus } from 'lucide-react'
import React from 'react'

type Props = {}

const ProjectButton = (props: Props) => {
  const { setOpen } = useModal()
  const { credits } = useBilling()

  const handleClick = () => {
    setOpen(
      <CustomModal
        title="Create a New Project"
        subheading="Projects help you organize your workflows and tasks."
      >
        <ProjectForm />
      </CustomModal>
    )
  }

  return (
    <Button
      size={'icon'}
      {...(credits !== '0'
        ? {
            onClick: handleClick,
          }
        : {
            disabled: true,
          })}
    >
      <Plus />
    </Button>
  )
}

export default ProjectButton
