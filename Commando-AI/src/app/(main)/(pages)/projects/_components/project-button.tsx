'use client'

import ProjectForm from '@/components/forms/project-form'
import CustomModal from '@/components/global/custom-modal'
import { Button } from '@/components/ui/button'
import { useBilling } from '@/providers/billing-provider'
import { useModal } from '@/providers/modal-provider'
import { Plus } from 'lucide-react'
import React from 'react'

type Props = {
  isGitHubConnected?: boolean
}

const ProjectButton = ({ isGitHubConnected = false }: Props) => {
  const { setOpen } = useModal()
  const { credits } = useBilling()

  const handleClick = () => {
    setOpen(
      <CustomModal
        title="Create a New Project"
        subheading="Set up your project details, tech stack, and GitHub integration."
      >
        <ProjectForm isGitHubConnected={isGitHubConnected} />
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
