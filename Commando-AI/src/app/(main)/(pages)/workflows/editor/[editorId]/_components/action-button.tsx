import React, { useCallback } from 'react'
import { Option } from './content-based-on-title'
import { ConnectionProviderProps } from '@/providers/connections-provider'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { postContentToWebHook } from '@/app/(main)/(pages)/connections/_actions/discord-connection'
import { onCreateNodeTemplate } from '../../../_actions/workflow-connections'
import { toast } from 'sonner'
import { onCreateNewPageInDatabase } from '@/app/(main)/(pages)/connections/_actions/notion-connection'
import { postMessageToSlack } from '@/app/(main)/(pages)/connections/_actions/slack-connection'

type Props = {
  currentService: string
  nodeConnection: ConnectionProviderProps
  channels?: Option[]
  setChannels?: (value: Option[]) => void
}

const ActionButton = ({
  currentService,
  nodeConnection,
  channels,
  setChannels,
}: Props) => {
  const pathname = usePathname()

  const onSendDiscordMessage = useCallback(async () => {
    const content = nodeConnection.discordNode.content
    const webhookURL = nodeConnection.discordNode.webhookURL
    
    if (!content) {
      toast.error('Please enter a message')
      return
    }
    
    if (!webhookURL) {
      toast.error('Discord not connected')
      return
    }

    // Send the test message
    const response = await postContentToWebHook(content, webhookURL)

    if (response.message == 'success') {
      toast.success('Test message sent!')
      
      // Also save the template automatically for workflow automation
      const workflowId = pathname.split('/').pop()!
      const templateResponse = await onCreateNodeTemplate(
        content,
        'Discord',
        workflowId
      )
      if (templateResponse) {
        toast.success('Template saved for automation')
      }
      
      nodeConnection.setDiscordNode((prev: any) => ({
        ...prev,
        content: '',
      }))
    } else {
      toast.error('Failed to send message')
    }
  }, [nodeConnection.discordNode, pathname])

  const onStoreNotionContent = useCallback(async () => {
    const { databaseId, accessToken, content } = nodeConnection.notionNode
    
    if (!databaseId || !accessToken) {
      toast.error('Notion not connected')
      return
    }
    
    console.log('Testing Notion:', databaseId, accessToken, content)
    
    const response = await onCreateNewPageInDatabase(databaseId, accessToken, content)
    
    if (response) {
      toast.success('Test entry created!')
      
      // Also save the template automatically
      const workflowId = pathname.split('/').pop()!
      const templateResponse = await onCreateNodeTemplate(
        JSON.stringify(content),
        'Notion',
        workflowId,
        [],
        accessToken,
        databaseId
      )
      if (templateResponse) {
        toast.success('Template saved for automation')
      }
      
      nodeConnection.setNotionNode((prev: any) => ({
        ...prev,
        content: '',
      }))
    }
  }, [nodeConnection.notionNode, pathname])

  const onStoreSlackContent = useCallback(async () => {
    const { slackAccessToken, content } = nodeConnection.slackNode
    
    if (!slackAccessToken) {
      toast.error('Slack not connected')
      return
    }
    
    if (!channels || channels.length === 0) {
      toast.error('Please select at least one channel')
      return
    }
    
    const response = await postMessageToSlack(slackAccessToken, channels, content)
    
    if (response.message == 'Success') {
      toast.success('Message sent successfully')
      
      // Also save the template automatically
      const workflowId = pathname.split('/').pop()!
      const templateResponse = await onCreateNodeTemplate(
        content,
        'Slack',
        workflowId,
        channels,
        slackAccessToken
      )
      if (templateResponse) {
        toast.success('Template saved for automation')
      }
      
      nodeConnection.setSlackNode((prev: any) => ({
        ...prev,
        content: '',
      }))
      setChannels!([])
    } else {
      toast.error(response.message)
    }
  }, [nodeConnection.slackNode, channels, pathname])

  const onCreateLocalNodeTempate = useCallback(async () => {
    if (currentService === 'Discord') {
      const response = await onCreateNodeTemplate(
        nodeConnection.discordNode.content,
        currentService,
        pathname.split('/').pop()!
      )

      if (response) {
        toast.message(response)
      }
    }
    if (currentService === 'Slack') {
      const response = await onCreateNodeTemplate(
        nodeConnection.slackNode.content,
        currentService,
        pathname.split('/').pop()!,
        channels,
        nodeConnection.slackNode.slackAccessToken
      )

      if (response) {
        toast.message(response)
      }
    }

    if (currentService === 'Notion') {
      const response = await onCreateNodeTemplate(
        JSON.stringify(nodeConnection.notionNode.content),
        currentService,
        pathname.split('/').pop()!,
        [],
        nodeConnection.notionNode.accessToken,
        nodeConnection.notionNode.databaseId
      )

      if (response) {
        toast.message(response)
      }
    }
  }, [nodeConnection, channels])

  const renderActionButton = () => {
    switch (currentService) {
      case 'Discord':
        return (
          <Button
            variant="outline"
            onClick={onSendDiscordMessage}
          >
            Test & Save
          </Button>
        )

      case 'Notion':
        return (
          <Button
            variant="outline"
            onClick={onStoreNotionContent}
          >
            Test & Save
          </Button>
        )

      case 'Slack':
        return (
          <Button
            variant="outline"
            onClick={onStoreSlackContent}
          >
            Test & Save
          </Button>
        )

      default:
        return null
    }
  }
  return renderActionButton()
}

export default ActionButton
