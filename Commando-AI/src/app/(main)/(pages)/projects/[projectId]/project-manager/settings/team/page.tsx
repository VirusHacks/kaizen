import React, { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import TeamManagement from './_components/team-management'

type Props = {
  params: { projectId: string }
}

const TeamSettingsPage = ({ params }: Props) => {
  return (
    <div className="flex flex-col relative">
      <div className="sticky top-0 z-[10] p-6 bg-background/50 backdrop-blur-lg border-b">
        <h1 className="text-2xl font-semibold">Team Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage project members and their roles
        </p>
      </div>

      <div className="p-6">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <TeamManagement projectId={params.projectId} />
        </Suspense>
      </div>
    </div>
  )
}

export default TeamSettingsPage
