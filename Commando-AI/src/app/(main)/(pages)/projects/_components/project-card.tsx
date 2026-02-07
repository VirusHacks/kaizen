'use client'

import React from 'react'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Archive, ArchiveRestore, Edit, FolderKanban, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { archiveProject, restoreProject } from '../_actions/project-actions'
import { useRouter } from 'next/navigation'
import { useModal } from '@/providers/modal-provider'
import CustomModal from '@/components/global/custom-modal'
import ProjectForm from '@/components/forms/project-form'

type Props = {
  id: string
  name: string
  projectKey: string
  description: string | null
  isArchived: boolean
  createdAt: Date
}

const ProjectCard = ({ id, name, projectKey, description, isArchived, createdAt }: Props) => {
  const router = useRouter()
  const { setOpen } = useModal()

  const handleArchive = async () => {
    const result = await archiveProject(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(result.message)
      router.refresh()
    }
  }

  const handleRestore = async () => {
    const result = await restoreProject(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(result.message)
      router.refresh()
    }
  }

  const handleEdit = () => {
    setOpen(
      <CustomModal
        title="Edit Project"
        subheading="Update your project details."
      >
        <ProjectForm
          mode="edit"
          defaultValues={{
            id,
            name,
            key: projectKey,
            description: description || '',
          }}
        />
      </CustomModal>
    )
  }

  return (
    <Card className="flex w-full items-center justify-between hover:border-primary/50 transition-colors">
      <CardHeader className="flex flex-col gap-2">
        <Link href={`/projects/${id}`} className="flex flex-row items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FolderKanban className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{name}</CardTitle>
              <Badge variant="secondary" className="font-mono text-xs">
                {projectKey}
              </Badge>
              {isArchived && (
                <Badge variant="outline" className="text-muted-foreground">
                  Archived
                </Badge>
              )}
            </div>
            <CardDescription className="mt-1">
              {description || 'No description provided'}
            </CardDescription>
          </div>
        </Link>
      </CardHeader>
      <div className="flex items-center gap-2 p-4">
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
            {isArchived ? (
              <DropdownMenuItem onClick={handleRestore}>
                <ArchiveRestore className="mr-2 h-4 w-4" />
                Restore
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={handleArchive} className="text-destructive">
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  )
}

export default ProjectCard
