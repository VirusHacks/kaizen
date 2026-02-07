'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { FolderKanban, Calendar, User, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  project: {
    id: string
    name: string
    key: string
    description: string | null
    isArchived: boolean
    createdAt: string
    owner: {
      clerkId: string
      name: string | null
      email: string
      profileImage: string | null
    }
  }
}

const ProjectSummaryCard = ({ project }: Props) => {
  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <FolderKanban className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">{project.name}</CardTitle>
                <Badge variant="secondary" className="font-mono">
                  {project.key}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1">
                {project.isArchived ? (
                  <Badge variant="outline" className="text-muted-foreground">
                    Archived
                  </Badge>
                ) : (
                  <Badge variant="default" className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                    Active
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {project.description || 'No description provided'}
        </p>
        
        <div className="flex flex-wrap gap-4 pt-2 border-t">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Owner:</span>
            <div className="flex items-center gap-1.5">
              <Avatar className="h-5 w-5">
                <AvatarImage src={project.owner.profileImage || undefined} />
                <AvatarFallback className="text-[10px]">
                  {project.owner.name?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{project.owner.name || project.owner.email}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Created:</span>
            <span className="font-medium">
              {new Date(project.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ProjectSummaryCard
