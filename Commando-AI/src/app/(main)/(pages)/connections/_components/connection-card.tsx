'use client'

import { ConnectionTypes } from '@/lib/types'
import React, { useState } from 'react'
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
import { Loader2, Unplug } from 'lucide-react'
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
  const router = useRouter()

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
