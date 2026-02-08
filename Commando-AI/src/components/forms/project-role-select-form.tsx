'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, ShieldCheck, AlertCircle, Crown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useModal } from '@/providers/modal-provider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Props = {
  projectId: string
}

const ROLE_LABELS: Record<string, string> = {
  DEVELOPER: 'Developer',
  QA_TESTER: 'QA Tester',
  FINANCE: 'Finance',
  SALES: 'Sales',
  EXECUTIVE: 'Executive',
  PROJECT_MANAGER: 'Project Manager',
}

const ROLE_ROUTES: Record<string, string> = {
  DEVELOPER: 'developer',
  QA_TESTER: 'qa-tester',
  FINANCE: 'finance',
  SALES: 'sales',
  EXECUTIVE: 'executives',
  PROJECT_MANAGER: 'project-manager',
}

const ProjectRoleSelectForm = ({ projectId }: Props) => {
  const [isLoading, setIsLoading] = useState(true)
  const [memberRole, setMemberRole] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [isSuperUser, setIsSuperUser] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { setClose } = useModal()

  // Auto-lookup the user's role on mount
  useEffect(() => {
    const lookupRole = async () => {
      try {
        const response = await fetch('/api/projects/access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId }),
        })

        const result = await response.json()

        if (!response.ok) {
          setError(result.error || 'You do not have access to this project')
          setIsLoading(false)
          return
        }

        setMemberRole(result.role)
        setSelectedRole(result.role)
        setIsSuperUser(result.isSuperUser || false)
        setIsLoading(false)
      } catch (err) {
        console.error('Error looking up role:', err)
        setError('Failed to check project access')
        setIsLoading(false)
      }
    }

    lookupRole()
  }, [projectId])

  const handleAccess = async () => {
    const roleToUse = isSuperUser ? selectedRole : memberRole
    if (!roleToUse) return

    // If super user selected a different role, call API again to set the cookie
    if (isSuperUser && selectedRole !== memberRole) {
      try {
        const response = await fetch('/api/projects/access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, selectedRole }),
        })

        if (!response.ok) {
          toast.error('Failed to set role')
          return
        }
      } catch {
        toast.error('Failed to set role')
        return
      }
    }

    const roleRoute = ROLE_ROUTES[roleToUse]
    if (!roleRoute) {
      toast.error('Unknown role')
      return
    }
    toast.success('Access granted! Redirecting...')
    setClose()
    router.push(`/projects/${projectId}/${roleRoute}`)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Checking your access...</p>
      </div>
    )
  }

  // Error / no access
  if (error) {
    return (
      <div className="flex flex-col items-center py-6 gap-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
        <Button variant="outline" onClick={() => setClose()}>
          Close
        </Button>
      </div>
    )
  }

  // Super user — show role selector
  if (isSuperUser) {
    return (
      <div className="flex flex-col items-center py-6 gap-5">
        <div className="flex items-center gap-2 text-yellow-500">
          <Crown className="h-6 w-6" />
          <p className="text-sm font-medium">Super User Access</p>
        </div>
        <div className="w-full space-y-3">
          <p className="text-sm text-muted-foreground text-center">
            Select the role you want to use for this project
          </p>
          <Select
            value={selectedRole || undefined}
            onValueChange={(value) => setSelectedRole(value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ROLE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-3 w-full">
          <Button
            variant="outline"
            onClick={() => setClose()}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAccess}
            className="flex-1"
            disabled={!selectedRole}
          >
            Open as {selectedRole ? ROLE_LABELS[selectedRole] : '...'}
          </Button>
        </div>
      </div>
    )
  }

  // Regular user — show confirmation and enter
  return (
    <div className="flex flex-col items-center py-6 gap-5">
      <div className="flex items-center gap-2 text-green-500">
        <ShieldCheck className="h-6 w-6" />
        <p className="text-sm font-medium">Access verified</p>
      </div>
      <div className="text-center space-y-1">
        <p className="text-lg font-semibold">
          {ROLE_LABELS[memberRole!] || memberRole}
        </p>
        <p className="text-sm text-muted-foreground">
          Your assigned role for this project
        </p>
      </div>
      <div className="flex gap-3 w-full">
        <Button
          variant="outline"
          onClick={() => setClose()}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button onClick={handleAccess} className="flex-1">
          Open Project
        </Button>
      </div>
    </div>
  )
}

export default ProjectRoleSelectForm
