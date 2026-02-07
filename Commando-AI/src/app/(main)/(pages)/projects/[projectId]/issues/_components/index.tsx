import React from 'react'
import IssueCard from './issue-card'
import { getProjectIssues } from '../_actions/issue-actions'
import { ListTodo } from 'lucide-react'

type Props = {
  projectId: string
}

const IssuesList = async ({ projectId }: Props) => {
  const { data: issues, error, project } = await getProjectIssues(projectId)

  if (error) {
    return (
      <div className="mt-28 flex text-muted-foreground items-center justify-center flex-col gap-2">
        <p>Failed to load issues</p>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col gap-4">
      <section className="flex flex-col gap-2 m-2">
        {issues?.length ? (
          issues.map((issue) => (
            <IssueCard
              key={issue.id}
              id={issue.id}
              number={issue.number}
              title={issue.title}
              description={issue.description}
              type={issue.type}
              status={issue.status}
              priority={issue.priority}
              projectId={projectId}
              projectKey={project?.key || ''}
              assignee={issue.assignee}
              subtaskCount={issue._count.children}
            />
          ))
        ) : (
          <div className="mt-28 flex text-muted-foreground items-center justify-center flex-col gap-4">
            <ListTodo className="h-12 w-12 opacity-50" />
            <p>No issues yet</p>
            <p className="text-sm text-center max-w-md">
              Create your first issue to start tracking work in this project.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

export default IssuesList
