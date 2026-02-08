'use client'

import { ConnectionTypes } from '@/lib/types'
import React, { useState, useEffect } from 'react'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2, Unplug, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Props = {
  type: ConnectionTypes
  icon: string
  title: ConnectionTypes
  description: string
  callback?: () => void
  connected: {} & any
}

const ConnectionCard = ({
  description,
  type,
  icon,
  title,
  connected,
}: Props) => {
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [githubPermissions, setGithubPermissions] = useState<{
    ok: boolean
    fix?: string
    permissions?: Record<string, { ok: boolean; detail?: string }>
  } | null>(null)
  const [checkingPermissions, setCheckingPermissions] = useState(false)
  const router = useRouter()

  // Check GitHub permissions when connected
  useEffect(() => {
    if (title === 'GitHub' && connected[type]) {
      setCheckingPermissions(true)
      fetch('/api/github/verify-permissions')
        .then((r) => r.json())
        .then((data) => setGithubPermissions(data))
        .catch(() => setGithubPermissions(null))
        .finally(() => setCheckingPermissions(false))
    }
  }, [title, type, connected])

  const handleDisconnect = async () => {
    if (!confirm(`Are you sure you want to disconnect ${title}?`)) {
      return
    }

    setIsDisconnecting(true)
    try {
      const response = await fetch('/api/connections/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: title }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disconnect')
      }

      toast.success(`${title} disconnected successfully`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to disconnect')
    } finally {
      setIsDisconnecting(false)
    }
  }

  const getConnectUrl = () => {
    switch (title) {
      case 'Discord':
        return process.env.NEXT_PUBLIC_DISCORD_REDIRECT!
      case 'Notion':
        return process.env.NEXT_PUBLIC_NOTION_AUTH_URL!
      case 'Slack':
        return process.env.NEXT_PUBLIC_SLACK_REDIRECT!
      case 'Google Drive':
      case 'Google Calendar':
      case 'Gmail':
        return '/api/auth/google'
      case 'GitHub':
        // GitHub App OAuth flow — always request scopes explicitly
        const clientId = process.env.NEXT_PUBLIC_GITHUB_APP_CLIENT_ID || process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || ''
        const redirectUri = encodeURIComponent(
          process.env.NEXT_PUBLIC_URL
            ? `${process.env.NEXT_PUBLIC_URL}/api/auth/callback/github`
            : 'https://localhost:3000/api/auth/callback/github'
        )
        if (!clientId) {
          console.error('No GitHub client ID configured. Set NEXT_PUBLIC_GITHUB_APP_CLIENT_ID or NEXT_PUBLIC_GITHUB_CLIENT_ID')
          return '#'
        }
        return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=repo,user,read:org`
      default:
        return '#'
    }
  }

  return (
    <Card className="flex w-full items-center justify-between">
      <CardHeader className="flex flex-col gap-4">
        <div className="flex flex-row gap-2">
          <Image
            src={icon}
            alt={title}
            height={30}
            width={30}
            className="object-contain"
          />
        </div>
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <div className="flex flex-col items-center gap-2 p-4">
        {connected[type] ? (
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-lg border-2 border-green-500 bg-green-500/10 px-3 py-2 text-sm font-bold text-green-500">
              Connected
            </div>
            {/* GitHub permission status */}
            {title === 'GitHub' && checkingPermissions && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Checking permissions...
              </div>
            )}
            {title === 'GitHub' && githubPermissions && !githubPermissions.ok && (
              <div className="flex max-w-[280px] flex-col items-center gap-1 rounded border border-yellow-500/50 bg-yellow-500/10 p-2 text-center">
                <div className="flex items-center gap-1 text-xs font-semibold text-yellow-500">
                  <AlertTriangle className="h-3 w-3" />
                  Limited Permissions
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Your GitHub App needs additional permissions to create repos, manage issues, etc.
                </p>
                <a
                  href="https://github.com/settings/apps/kaizen-commando-ai/permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] text-blue-400 hover:underline"
                >
                  Configure App Permissions <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            )}
            {title === 'GitHub' && githubPermissions?.ok && (
              <div className="flex items-center gap-1 text-xs text-green-500">
                <CheckCircle2 className="h-3 w-3" />
                Full access
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="text-xs text-neutral-500 hover:text-red-500"
            >
              {isDisconnecting ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Unplug className="mr-1 h-3 w-3" />
              )}
              Disconnect
            </Button>
          </div>
        ) : (
          <Link
            href={getConnectUrl()}
            className="rounded-lg bg-primary p-2 font-bold text-primary-foreground"
          >
            Connect
          </Link>
        )}
      </div>
    </Card>
  )
}

export default ConnectionCard
