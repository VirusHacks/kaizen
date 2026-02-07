import React from 'react'
import ProjectCard from './project-card'
import { getUserProjects } from '../_actions/project-actions'
import { FolderKanban } from 'lucide-react'

type Props = {}

const ProjectsList = async (props: Props) => {
  const { data: projects, error } = await getUserProjects()

  if (error) {
    return (
      <div className="mt-28 flex text-muted-foreground items-center justify-center flex-col gap-2">
        <p>Failed to load projects</p>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col gap-4">
      <section className="flex flex-col gap-2 m-2">
        {projects?.length ? (
          projects.map((project) => (
            <ProjectCard
              key={project.id}
              id={project.id}
              name={project.name}
              projectKey={project.key}
              description={project.description}
              isArchived={project.isArchived}
              createdAt={project.createdAt}
            />
          ))
        ) : (
          <div className="mt-28 flex text-muted-foreground items-center justify-center flex-col gap-4">
            <FolderKanban className="h-12 w-12 opacity-50" />
            <p>No projects yet</p>
            <p className="text-sm text-center max-w-md">
              Create your first project to start organizing your workflows and tasks.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

export default ProjectsList
