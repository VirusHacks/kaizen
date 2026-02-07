'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Users,
  UserPlus,
  Crown,
  Shield,
  User,
  Eye,
  Trash2,
  Loader2,
  Mail,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProjectRole } from '@prisma/client'
import {
  inviteProjectMember,
  updateMemberRole,
  removeProjectMember,
} from '../_actions/team-actions'

// Types
type TeamMember = {
  id: string
  userId: string
  role: ProjectRole | 'OWNER'
  joinedAt: Date
  user: {
    clerkId: string
    name: string | null
    email: string
    profileImage: string | null
  }
}

type Props = {
  projectId: string
  projectName: string
  members: TeamMember[]
  currentUserRole: ProjectRole | 'OWNER' | null
  projectOwnerId: string
}

// Role configuration
const ROLE_CONFIG: Record<ProjectRole | 'OWNER', { label: string; icon: React.ElementType; color: string }> = {
  OWNER: { label: 'Owner', icon: Crown, color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  ADMIN: { label: 'Admin', icon: Shield, color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  MEMBER: { label: 'Member', icon: User, color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  VIEWER: { label: 'Viewer', icon: Eye, color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
}

const TeamManagementClient = ({
  projectId,
  projectName,
  members,
  currentUserRole,
  projectOwnerId,
}: Props) => {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<ProjectRole>('MEMBER')

  const canManageMembers = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN'
  const canChangeRoles = currentUserRole === 'OWNER'

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address')
      return
    }

    startTransition(async () => {
      const result = await inviteProjectMember(projectId, inviteEmail.trim(), inviteRole)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(result.message)
        setIsInviteOpen(false)
        setInviteEmail('')
        setInviteRole('MEMBER')
        router.refresh()
      }
    })
  }

  const handleRoleChange = (memberId: string, newRole: ProjectRole) => {
    startTransition(async () => {
      const result = await updateMemberRole(projectId, memberId, newRole)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(result.message)
        router.refresh()
      }
    })
  }

  const handleRemoveMember = (memberId: string) => {
    startTransition(async () => {
      const result = await removeProjectMember(projectId, memberId)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(result.message)
        router.refresh()
      }
    })
  }

  const getRoleBadge = (role: ProjectRole | 'OWNER') => {
    const config = ROLE_CONFIG[role]
    const Icon = config.icon
    return (
      <Badge variant="outline" className={cn('gap-1', config.color)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members
              </CardTitle>
              <CardDescription>
                {members.length} member{members.length !== 1 ? 's' : ''} in {projectName}
              </CardDescription>
            </div>
            {canManageMembers && (
              <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>
                      Invite a user to join this project by their email address.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="user@example.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        The user must have an existing account.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={inviteRole}
                        onValueChange={(value) => setInviteRole(value as ProjectRole)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {canChangeRoles && (
                            <SelectItem value="ADMIN">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-blue-500" />
                                Admin - Can manage members
                              </div>
                            </SelectItem>
                          )}
                          <SelectItem value="MEMBER">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-green-500" />
                              Member - Can edit issues
                            </div>
                          </SelectItem>
                          <SelectItem value="VIEWER">
                            <div className="flex items-center gap-2">
                              <Eye className="h-4 w-4 text-gray-500" />
                              Viewer - Read-only access
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsInviteOpen(false)}
                      disabled={isPending}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleInvite} disabled={isPending}>
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <UserPlus className="h-4 w-4 mr-2" />
                      )}
                      Send Invite
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                {canManageMembers && <TableHead className="w-[100px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const isOwner = member.role === 'OWNER'
                const canEditThisMember = canChangeRoles && !isOwner
                const canRemoveThisMember =
                  !isOwner &&
                  (canChangeRoles ||
                    (currentUserRole === 'ADMIN' &&
                      member.role !== 'ADMIN' &&
                      member.role !== 'OWNER'))

                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.user.profileImage || undefined} />
                          <AvatarFallback>
                            {member.user.name?.[0]?.toUpperCase() ||
                              member.user.email[0]?.toUpperCase() ||
                              '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {member.user.name || 'Unnamed User'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {member.user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {canEditThisMember ? (
                        <Select
                          value={member.role}
                          onValueChange={(value) =>
                            handleRoleChange(member.id, value as ProjectRole)
                          }
                          disabled={isPending}
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">
                              <div className="flex items-center gap-2">
                                <Shield className="h-3 w-3 text-blue-500" />
                                Admin
                              </div>
                            </SelectItem>
                            <SelectItem value="MEMBER">
                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3 text-green-500" />
                                Member
                              </div>
                            </SelectItem>
                            <SelectItem value="VIEWER">
                              <div className="flex items-center gap-2">
                                <Eye className="h-3 w-3 text-gray-500" />
                                Viewer
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        getRoleBadge(member.role)
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(member.joinedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </TableCell>
                    {canManageMembers && (
                      <TableCell>
                        {canRemoveThisMember && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                disabled={isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Member?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove{' '}
                                  <strong>{member.user.name || member.user.email}</strong>{' '}
                                  from this project? They will lose access immediately.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemoveMember(member.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {members.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No team members yet</p>
              {canManageMembers && (
                <p className="text-sm">Invite members to collaborate on this project.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permissions Reference Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {Object.entries(ROLE_CONFIG).map(([role, config]) => {
              const Icon = config.icon
              const permissions = {
                OWNER: ['Full project access', 'Manage all members', 'Change any role', 'Delete project'],
                ADMIN: ['Edit project settings', 'Invite/remove members', 'Manage issues & sprints'],
                MEMBER: ['Create & edit issues', 'Update sprints', 'View team'],
                VIEWER: ['View issues & board', 'View timeline', 'Read-only access'],
              }[role as ProjectRole | 'OWNER']

              return (
                <div key={role} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className={cn('h-4 w-4', config.color.split(' ')[1])} />
                    <span className="font-medium text-sm">{config.label}</span>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {permissions.map((perm, i) => (
                      <li key={i}>• {perm}</li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default TeamManagementClient
