'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Users, ArrowRight, Crown, Shield, UserCheck, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProjectRole } from '@prisma/client'

type TeamMember = {
  id: string
  userId: string
  role: ProjectRole | 'OWNER'
  user: {
    clerkId: string
    name: string | null
    email: string
    profileImage: string | null
  }
}

type Props = {
  projectId: string
  totalCount: number
  members: TeamMember[]
}

const ROLE_CONFIG: Record<ProjectRole | 'OWNER', { label: string; icon: React.ElementType; color: string }> = {
  OWNER: { label: 'Owner', icon: Crown, color: 'text-yellow-500' },
  ADMIN: { label: 'Admin', icon: Shield, color: 'text-blue-500' },
  MEMBER: { label: 'Member', icon: UserCheck, color: 'text-green-500' },
  VIEWER: { label: 'Viewer', icon: Eye, color: 'text-gray-500' },
}

const TeamOverviewCard = ({ projectId, totalCount, members }: Props) => {
  const displayMembers = members.slice(0, 6)
  const remainingCount = totalCount - displayMembers.length

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4" />
          Team Members
        </CardTitle>
        <Badge variant="secondary">{totalCount}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Member Avatars */}
        <div className="flex items-center -space-x-2">
          {displayMembers.map((member) => {
            const roleConfig = ROLE_CONFIG[member.role]
            return (
              <div key={member.id} className="relative group">
                <Avatar className="h-9 w-9 border-2 border-background">
                  <AvatarImage src={member.user.profileImage || undefined} />
                  <AvatarFallback className="text-xs">
                    {member.user.name?.[0] || member.user.email[0]}
                  </AvatarFallback>
                </Avatar>
                {/* Role indicator */}
                <div className={cn(
                  "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-background flex items-center justify-center",
                )}>
                  <roleConfig.icon className={cn("h-2.5 w-2.5", roleConfig.color)} />
                </div>
              </div>
            )
          })}
          {remainingCount > 0 && (
            <div className="h-9 w-9 rounded-full bg-muted border-2 border-background flex items-center justify-center">
              <span className="text-xs font-medium text-muted-foreground">
                +{remainingCount}
              </span>
            </div>
          )}
        </div>

        {/* Role breakdown */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(ROLE_CONFIG).map(([role, config]) => {
            const count = members.filter((m) => m.role === role).length
            if (count === 0) return null
            return (
              <Badge key={role} variant="outline" className="text-xs gap-1">
                <config.icon className={cn("h-3 w-3", config.color)} />
                {count} {config.label}{count > 1 ? 's' : ''}
              </Badge>
            )
          })}
        </div>

        {/* Link to team page */}
        <Link href={`/projects/${projectId}/settings/team`}>
          <Button variant="ghost" size="sm" className="w-full justify-between">
            Manage Team
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

export default TeamOverviewCard
