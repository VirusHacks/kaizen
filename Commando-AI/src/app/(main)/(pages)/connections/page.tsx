import { CONNECTIONS } from '@/lib/constant'
import React from 'react'
import ConnectionCard from './_components/connection-card'
import { currentUser } from '@clerk/nextjs/server'
import { clerkClient } from '@clerk/nextjs/server'
import { onDiscordConnect } from './_actions/discord-connection'
import { onNotionConnect } from './_actions/notion-connection'
import { onSlackConnect } from './_actions/slack-connection'
import { getUserData } from './_actions/get-user'

type Props = {
  searchParams?: { [key: string]: string | undefined }
}

const Connections = async (props: Props) => {
  const {
    webhook_id,
    webhook_name,
    webhook_url,
    guild_id,
    guild_name,
    channel_id,
    access_token,
    workspace_name,
    workspace_icon,
    workspace_id,
    database_id,
    app_id,
    authed_user_id,
    authed_user_token,
    slack_access_token,
    bot_user_id,
    team_id,
    team_name,
  } = props.searchParams ?? {}

  const user = await currentUser()
  if (!user) return null

  const onUserConnections = async () => {
    const connections: Record<string, boolean> = {}
    
    try {
      // Only call Discord connect if we have the required params
      if (webhook_id && channel_id) {
        await onDiscordConnect(
          channel_id,
          webhook_id,
          webhook_name || '',
          webhook_url || '',
          user.id,
          guild_name || '',
          guild_id || ''
        )
      }

      // Only call Notion connect if we have the required params
      if (access_token && workspace_id) {
        await onNotionConnect(
          access_token,
          workspace_id,
          workspace_icon || '',
          workspace_name || '',
          database_id || '',
          user.id
        )
      }

      // Only call Slack connect if we have the required params
      if (slack_access_token && team_id) {
        await onSlackConnect(
          app_id || '',
          authed_user_id || '',
          authed_user_token || '',
          slack_access_token,
          bot_user_id || '',
          team_id,
          team_name || '',
          user.id
        )
      }
    } catch (error) {
      console.error('Error connecting services:', error)
    }

    try {
      const user_info = await getUserData(user.id)

      // Get user info with all connections
      if (user_info?.connections) {
        user_info.connections.forEach((connection) => {
          connections[connection.type] = true
        })
      }
    } catch (error) {
      console.error('Error getting user data:', error)
    }

    // Check if user has Google Drive connected
    let googleDriveConnected = false
    let googleCalendarConnected = false
    let gmailConnected = false
    try {
      const client = await clerkClient()
      const clerkUser = await client.users.getUser(user.id)
      
      // Check custom OAuth token (has Drive, Calendar, and Gmail scope)
      const googleToken = clerkUser.privateMetadata?.googleAccessToken
      googleDriveConnected = !!googleToken
      googleCalendarConnected = !!googleToken  // Same OAuth token covers Drive, Calendar, and Gmail
      gmailConnected = !!googleToken
    } catch (error) {
      console.error('Google OAuth check error:', error)
      googleDriveConnected = false
      googleCalendarConnected = false
      gmailConnected = false
    }

    return { ...connections, 'Google Drive': googleDriveConnected, 'Google Calendar': googleCalendarConnected, 'Gmail': gmailConnected }
  }

  const connections = await onUserConnections()

  return (
    <div className="relative flex flex-col gap-4">
      <h1 className="sticky top-0 z-[10] flex items-center justify-between border-b bg-background/50 p-6 text-4xl backdrop-blur-lg">
        Connections
      </h1>
      <div className="relative flex flex-col gap-4">
        <section className="flex flex-col gap-4 p-6 text-muted-foreground">
          Connect all your apps directly from here. You may need to connect
          these apps regularly to refresh verification
          {CONNECTIONS.map((connection) => (
            <ConnectionCard
              key={connection.title}
              description={connection.description}
              title={connection.title}
              icon={connection.image}
              type={connection.title}
              connected={connections}
            />
          ))}
        </section>
      </div>
    </div>
  )
}

export default Connections
