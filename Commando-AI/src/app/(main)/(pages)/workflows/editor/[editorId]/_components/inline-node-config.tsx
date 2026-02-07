'use client'
import React, { useState, useEffect } from 'react'
import { Settings, X, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { EditorNodeType } from '@/lib/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type Props = {
  node: EditorNodeType
  onUpdateNode: (nodeId: string, data: any) => void
  className?: string
}

// Define quick config fields per node type
const nodeQuickConfigs: Record<string, { label: string; field: string; placeholder: string; type?: string }[]> = {
  Discord: [
    { label: 'Webhook URL', field: 'webhookUrl', placeholder: 'https://discord.com/api/webhooks/...' },
    { label: 'Message', field: 'message', placeholder: 'Enter notification message' },
  ],
  Slack: [
    { label: 'Channel', field: 'channel', placeholder: '#general' },
    { label: 'Message', field: 'message', placeholder: 'Enter message to send' },
  ],
  Email: [
    { label: 'To', field: 'to', placeholder: 'recipient@example.com' },
    { label: 'Subject', field: 'subject', placeholder: 'Email subject' },
  ],
  Notion: [
    { label: 'Database ID', field: 'databaseId', placeholder: 'Your Notion database ID' },
    { label: 'Page Title', field: 'pageTitle', placeholder: 'New page title' },
  ],
  Wait: [
    { label: 'Duration (seconds)', field: 'duration', placeholder: '60', type: 'number' },
  ],
  'Custom Webhook': [
    { label: 'Webhook URL', field: 'webhookUrl', placeholder: 'https://your-api.com/webhook' },
    { label: 'Method', field: 'method', placeholder: 'POST' },
  ],
  AI: [
    { label: 'Prompt', field: 'prompt', placeholder: 'Enter your AI prompt...' },
  ],
  'Google Calendar': [
    { label: 'Event Title', field: 'eventTitle', placeholder: 'Meeting title' },
    { label: 'Duration (minutes)', field: 'duration', placeholder: '30', type: 'number' },
  ],
  'Google Drive': [
    { label: 'Folder ID', field: 'folderId', placeholder: 'Google Drive folder ID' },
  ],
}

const InlineNodeConfig = ({ node, onUpdateNode, className }: Props) => {
  const [open, setOpen] = useState(false)
  const [localData, setLocalData] = useState<Record<string, any>>({})
  
  const configs = nodeQuickConfigs[node.type] || []
  
  // Initialize local data from node metadata
  useEffect(() => {
    setLocalData(node.data?.metadata || {})
  }, [node.data?.metadata])

  const handleSave = () => {
    onUpdateNode(node.id, {
      ...node.data,
      metadata: { ...node.data.metadata, ...localData },
    })
    toast.success('Node configuration saved!')
    setOpen(false)
  }

  const handleFieldChange = (field: string, value: any) => {
    setLocalData(prev => ({ ...prev, [field]: value }))
  }

  const isConfigured = configs.every(config => {
    const value = localData[config.field] || node.data?.metadata?.[config.field]
    return value && value.toString().trim() !== ''
  })

  if (configs.length === 0) return null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-6 w-6 rounded-full',
            isConfigured 
              ? 'bg-green-100 hover:bg-green-200 dark:bg-green-900/50' 
              : 'bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/50',
            className
          )}
        >
          {isConfigured ? (
            <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
          ) : (
            <Settings className="h-3 w-3 text-orange-600 dark:text-orange-400" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start" side="right">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-sm">Quick Configure</h4>
              <p className="text-xs text-muted-foreground">{node.type} settings</p>
            </div>
            {!isConfigured && (
              <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                <AlertCircle className="h-3 w-3" />
                <span className="text-xs">Needs setup</span>
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            {configs.map((config) => (
              <div key={config.field} className="space-y-1">
                <Label htmlFor={config.field} className="text-xs">
                  {config.label}
                </Label>
                <Input
                  id={config.field}
                  type={config.type || 'text'}
                  placeholder={config.placeholder}
                  value={localData[config.field] || ''}
                  onChange={(e) => handleFieldChange(config.field, e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="flex-1"
            >
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default InlineNodeConfig
