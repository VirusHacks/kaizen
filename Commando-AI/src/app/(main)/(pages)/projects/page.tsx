import React, { Suspense } from 'react'
import ProjectButton from './_components/project-button'
import ProjectsList from './_components'
import { Loader2 } from 'lucide-react'
import { checkGitHubConnection } from './_actions/project-actions'

type Props = {}

const ProjectsPage = async (props: Props) => {
  const isGitHubConnected = await checkGitHubConnection()

  return (
    <div className="flex flex-col relative">
      <h1 className="text-4xl sticky top-0 z-[10] p-6 bg-background/50 backdrop-blur-lg flex items-center border-b justify-between">
        Projects
        <ProjectButton isGitHubConnected={isGitHubConnected} />
      </h1>
      <Suspense fallback={
        <div className="flex items-center justify-center mt-28">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }>
        <ProjectsList />
      </Suspense>
    </div>
  )
}

export default ProjectsPage
