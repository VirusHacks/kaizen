'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { 
  Settings2, 
  Link2, 
  Zap, 
  FileText, 
  CheckCircle2, 
  XCircle,
  ExternalLink,
  Loader2,
  RefreshCw,
  Clock,
  GitBranch,
  Brain,
  Mail,
  Webhook,
  Calendar,
  Play,
  Copy,
  Save,
  Eye,
  Sparkles
} from 'lucide-react'
import { EditorNodeType, nodeMapper } from '@/lib/types'
import { useNodeConnections } from '@/providers/connections-provider'
import { useEditor } from '@/providers/editor-provider'
import { useFuzzieStore } from '@/store'
import { CONNECTIONS } from '@/lib/constant'
import { onContentChange, onConnections, fetchBotSlackChannels } from '@/lib/editor-utils'
import EditorCanvasIconHelper from './editor-canvas-card-icon-hepler'
import GoogleDriveFiles from './google-drive-files'
import GoogleFileDetails from './google-file-details'
import ActionButton from './action-button'
import MultipleSelector from '@/components/ui/multiple-selector'
import axios from 'axios'
import Link from 'next/link'

// Define which node types require OAuth connections
const OAUTH_NODE_TYPES = ['Discord', 'Slack', 'Notion', 'Google Drive', 'Google Calendar', 'Gmail Read', 'Gmail Send']

// Node types that don't require connections
const NO_CONNECTION_NODE_TYPES = ['Email', 'Wait', 'Condition', 'AI', 'Trigger', 'Custom Webhook', 'Action', 'HTTP Request', 'Schedule Trigger', 'Text Formatter', 'Data Filter', 'Code']

// Define variables available for each node type
const NODE_TYPE_VARIABLES: Record<string, { name: string; description: string }[]> = {
  // Trigger nodes
  'Google Drive': [
    { name: '{{fileName}}', description: 'Name of the uploaded file' },
    { name: '{{fileId}}', description: 'Google Drive file ID' },
    { name: '{{fileType}}', description: 'MIME type of the file' },
    { name: '{{fileSize}}', description: 'File size in bytes' },
    { name: '{{fileContent}}', description: 'Content of the file (if text)' },
    { name: '{{fileUrl}}', description: 'URL to the file' },
    { name: '{{triggerData}}', description: 'Full trigger data object' },
  ],
  'Trigger': [
    { name: '{{triggerData}}', description: 'Full trigger data object' },
    { name: '{{timestamp}}', description: 'Trigger timestamp' },
  ],
  'Schedule Trigger': [
    { name: '{{scheduledTime}}', description: 'Scheduled execution time' },
    { name: '{{triggerData}}', description: 'Full trigger data' },
    { name: '{{timestamp}}', description: 'Current timestamp' },
  ],
  // Gmail nodes
  'Gmail Read': [
    { name: '{{emails}}', description: 'Array of fetched emails' },
    { name: '{{emailCount}}', description: 'Number of emails found' },
    { name: '{{email.subject}}', description: 'Email subject line' },
    { name: '{{email.from}}', description: 'Sender email address' },
    { name: '{{email.body}}', description: 'Email body content' },
    { name: '{{email.date}}', description: 'Email date' },
    { name: '{{email.snippet}}', description: 'Email preview snippet' },
    { name: '{{previousOutput}}', description: 'Output from previous node' },
  ],
  'Gmail Send': [
    { name: '{{sent}}', description: 'Whether email was sent successfully' },
    { name: '{{messageId}}', description: 'Sent email message ID' },
    { name: '{{previousOutput}}', description: 'Output from previous node' },
  ],
  // Calendar
  'Google Calendar': [
    { name: '{{events}}', description: 'Array of calendar events' },
    { name: '{{event.title}}', description: 'Event title' },
    { name: '{{event.start}}', description: 'Event start time' },
    { name: '{{event.end}}', description: 'Event end time' },
    { name: '{{event.location}}', description: 'Event location' },
    { name: '{{previousOutput}}', description: 'Output from previous node' },
  ],
  // AI node
  'AI': [
    { name: '{{aiResponse}}', description: 'AI generated response' },
    { name: '{{summary}}', description: 'AI summary (if summarize task)' },
    { name: '{{previousOutput}}', description: 'Output from previous node' },
  ],
  // HTTP Request
  'HTTP Request': [
    { name: '{{response}}', description: 'HTTP response data' },
    { name: '{{status}}', description: 'HTTP status code' },
    { name: '{{headers}}', description: 'Response headers' },
    { name: '{{previousOutput}}', description: 'Output from previous node' },
  ],
  // Data nodes
  'Data Filter': [
    { name: '{{filtered}}', description: 'Filtered data array' },
    { name: '{{count}}', description: 'Number of items' },
    { name: '{{previousOutput}}', description: 'Output from previous node' },
  ],
  'Text Formatter': [
    { name: '{{formatted}}', description: 'Formatted text output' },
    { name: '{{previousOutput}}', description: 'Output from previous node' },
  ],
  'Condition': [
    { name: '{{condition}}', description: 'Condition result (true/false)' },
    { name: '{{previousOutput}}', description: 'Output from previous node' },
  ],
  'Code': [
    { name: '{{result}}', description: 'Code execution result' },
    { name: '{{previousOutput}}', description: 'Output from previous node' },
  ],
  // Default for any node
  'default': [
    { name: '{{previousOutput}}', description: 'Output from previous node' },
    { name: '{{triggerData}}', description: 'Original trigger data' },
    { name: '{{timestamp}}', description: 'Current timestamp' },
  ]
}

// Helper function to get source node from edges
function getSourceNodeType(nodeId: string, elements: any[], edges: any[]): string | null {
  // Find edge where target is our node
  const edge = edges.find((e: any) => e.target === nodeId)
  if (!edge) return null
  
  // Find the source node
  const sourceNode = elements.find((el: any) => el.id === edge.source)
  return sourceNode?.type || null
}

// Get context-aware variables based on source node
function getContextVariables(sourceNodeType: string | null): { name: string; description: string }[] {
  if (!sourceNodeType) {
    return NODE_TYPE_VARIABLES['default']
  }
  return NODE_TYPE_VARIABLES[sourceNodeType] || NODE_TYPE_VARIABLES['default']
}

interface NodeConfigModalProps {
  isOpen: boolean
  onClose: () => void
  node: EditorNodeType | null
}

export default function NodeConfigModal({ isOpen, onClose, node }: NodeConfigModalProps) {
  const { nodeConnection } = useNodeConnections()
  const { state, dispatch } = useEditor()
  const { 
    googleFile, 
    setGoogleFile, 
    slackChannels,
    setSlackChannels,
    selectedSlackChannels, 
    setSelectedSlackChannels 
  } = useFuzzieStore()
  const [isLoadingFile, setIsLoadingFile] = useState(false)
  const [isLoadingConnection, setIsLoadingConnection] = useState(false)
  const [activeTab, setActiveTab] = useState('config')
  const [connectionStatus, setConnectionStatus] = useState<{ connected: boolean; details: any }>({ connected: false, details: null })
  
  // Track if configuration has been saved
  const [isConfigSaved, setIsConfigSaved] = useState(false)
  const [isSavingConfig, setIsSavingConfig] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Local state for non-OAuth node configurations
  const [waitDuration, setWaitDuration] = useState({ value: 1, unit: 'minutes' })
  const [conditionConfig, setConditionConfig] = useState({ field: '', operator: 'equals', value: '' })
  const [aiConfig, setAiConfig] = useState({ 
    prompt: '', 
    model: 'gemini-2.5-flash', 
    temperature: 0.7, 
    maxTokens: 2048,
    taskType: 'general',
    systemPrompt: '',
    outputFormat: 'text'
  })
  const [emailConfig, setEmailConfig] = useState({ to: '', subject: '', body: '' })
  const [webhookConfig, setWebhookConfig] = useState({ url: '', method: 'POST', headers: '' })
  const [calendarConfig, setCalendarConfig] = useState({ 
    // Action type: 'create', 'read', 'update', 'delete', 'list', 'search'
    action: 'create',
    // Create/Update fields
    title: '', 
    description: '',
    date: '', 
    time: '', 
    duration: 30,
    location: '',
    attendees: '',
    reminder: 15,
    timeZone: 'UTC',
    // Read/List/Search fields
    readAction: 'list', // 'list', 'today', 'upcoming', 'search', 'get', 'freebusy'
    maxResults: 10,
    searchQuery: '',
    eventId: '',
    calendarId: 'primary',
    // Trigger fields
    triggerType: 'event_start', // 'event_start', 'event_created', 'reminder'
    minutesBefore: 15,
  })

  // Gmail Read configuration
  const [gmailReadConfig, setGmailReadConfig] = useState({
    action: 'list', // 'list', 'get', 'thread', 'search'
    maxResults: 10,
    // Filters
    from: '',
    to: '',
    subject: '',
    label: '', // INBOX, SENT, DRAFT, IMPORTANT, STARRED, etc.
    hasAttachment: false,
    isUnread: false,
    isStarred: false,
    after: '', // Date string YYYY/MM/DD
    before: '', // Date string YYYY/MM/DD
    query: '', // Custom Gmail search query
    // For specific message/thread
    messageId: '',
    threadId: '',
  })

  // Gmail Send configuration
  const [gmailSendConfig, setGmailSendConfig] = useState({
    action: 'send', // 'send', 'draft', 'reply'
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    bodyText: '',
    bodyHtml: '',
    useHtml: false,
    // For reply
    replyToMessageId: '',
    // For thread
    threadId: '',
  })

  // Discord message configuration
  const [discordConfig, setDiscordConfig] = useState({
    message: '',
    useVariables: true,
  })

  // Slack message configuration  
  const [slackConfig, setSlackConfig] = useState({
    message: '',
    useVariables: true,
  })

  // Notion content configuration
  const [notionConfig, setNotionConfig] = useState({
    content: '',
    useVariables: true,
  })
  
  // New node configurations
  const [httpRequestConfig, setHttpRequestConfig] = useState({ 
    url: '', 
    method: 'GET', 
    headers: '{\n  "Content-Type": "application/json"\n}', 
    body: '',
    authType: 'none',
    authValue: '',
    timeout: 30,
    retries: 0
  })
  const [scheduleConfig, setScheduleConfig] = useState({ 
    type: 'interval', 
    interval: 1, 
    intervalUnit: 'hours',
    cronExpression: '0 * * * *',
    timezone: 'UTC',
    dayOfWeek: ['mon'],
    timeOfDay: '09:00'
  })
  const [textFormatterConfig, setTextFormatterConfig] = useState({ 
    operation: 'template', 
    template: '',
    findText: '',
    replaceText: '',
    transformType: 'lowercase'
  })
  const [dataFilterConfig, setDataFilterConfig] = useState({ 
    filterType: 'property',
    propertyPath: '',
    operator: 'equals',
    value: '',
    arrayPath: '',
    sortBy: '',
    sortOrder: 'asc',
    limit: 0
  })
  const [codeConfig, setCodeConfig] = useState({ 
    code: `// Access input data with 'input' variable
// Return output with 'return' statement

// Example:
const result = input.data.map(item => ({
  ...item,
  processed: true
}));

return result;`,
    language: 'javascript',
    timeout: 10
  })

  // Use node.type for service lookup (e.g., "Discord"), and node.data.title for display (e.g., "Send Discord Notification")
  const serviceType = node?.type || ''
  const displayTitle = node?.data?.title || serviceType

  // Map node types to their connection types (for split nodes like Gmail Read/Gmail Send)
  const getConnectionType = (nodeType: string): string => {
    if (nodeType === 'Gmail Read' || nodeType === 'Gmail Send') return 'Gmail'
    return nodeType
  }
  const connectionType = getConnectionType(serviceType)

  // Get source node type for context-aware variables
  const sourceNodeType = node ? getSourceNodeType(node.id, state.editor.elements, state.editor.edges) : null
  const availableVariables = getContextVariables(sourceNodeType)

  // Check if this node type requires OAuth connection
  const requiresOAuth = OAUTH_NODE_TYPES.includes(serviceType)

  // Load configuration from node metadata when modal opens
  // IMPORTANT: Read from state.editor.elements to get latest saved data, not from node prop
  useEffect(() => {
    if (isOpen && node) {
      // Find the current node from editor state elements (this has the latest saved data)
      const currentNode = state.editor.elements.find(el => el.id === node.id) as EditorNodeType | undefined
      const metadata = currentNode?.data?.metadata || {}
      const nodeType = currentNode?.type || node.type
      
      // Load AI config
      if (nodeType === 'AI' && metadata.aiConfig) {
        setAiConfig(prev => ({
          ...prev,
          ...metadata.aiConfig
        }))
        setIsConfigSaved(true)
      } else if (nodeType === 'AI') {
        // Reset to defaults if no saved config
        setAiConfig({
          prompt: '',
          model: 'gemini-2.5-flash',
          temperature: 0.7,
          maxTokens: 2048,
          taskType: 'general',
          systemPrompt: '',
          outputFormat: 'text'
        })
        setIsConfigSaved(false)
      }

      // Load Discord config
      if (nodeType === 'Discord' && metadata.discordConfig) {
        setDiscordConfig(prev => ({ ...prev, ...metadata.discordConfig }))
        setIsConfigSaved(true)
      } else if (nodeType === 'Discord') {
        setDiscordConfig({ message: '', useVariables: true })
        setIsConfigSaved(false)
      }

      // Load Slack config
      if (nodeType === 'Slack' && metadata.slackConfig) {
        setSlackConfig(prev => ({ ...prev, ...metadata.slackConfig }))
        setIsConfigSaved(true)
      } else if (nodeType === 'Slack') {
        setSlackConfig({ message: '', useVariables: true })
        setIsConfigSaved(false)
      }

      // Load Notion config
      if (nodeType === 'Notion' && metadata.notionConfig) {
        setNotionConfig(prev => ({ ...prev, ...metadata.notionConfig }))
        setIsConfigSaved(true)
      } else if (nodeType === 'Notion') {
        setNotionConfig({ content: '', useVariables: true })
        setIsConfigSaved(false)
      }
      
      setShowPreview(false)
    }
  }, [isOpen, node?.id, state.editor.elements])

  // Save configuration to node metadata
  const saveNodeConfig = useCallback(() => {
    if (!node) return
    
    setIsSavingConfig(true)
    
    try {
      // Get current elements from editor state
      const elements = state.editor.elements
      
      // Find and update the current node
      const updatedElements = elements.map(el => {
        if (el.id === node.id) {
          let configToSave = {}
          
          if (node.type === 'AI') {
            configToSave = { aiConfig }
          } else if (node.type === 'Discord') {
            configToSave = { discordConfig }
          } else if (node.type === 'Slack') {
            configToSave = { slackConfig }
          } else if (node.type === 'Notion') {
            configToSave = { notionConfig }
          }
          
          return {
            ...el,
            data: {
              ...el.data,
              metadata: {
                ...el.data.metadata,
                ...configToSave
              }
            }
          }
        }
        return el
      })
      
      // Dispatch update to editor state
      dispatch({
        type: 'UPDATE_NODE',
        payload: { elements: updatedElements }
      })
      
      setIsConfigSaved(true)
      toast.success('Configuration saved!')
    } catch (error) {
      console.error('Failed to save config:', error)
      toast.error('Failed to save configuration')
    } finally {
      setIsSavingConfig(false)
    }
  }, [node, aiConfig, discordConfig, slackConfig, notionConfig, state.editor.elements, dispatch])

  // Set default tab based on node type
  useEffect(() => {
    if (isOpen && node) {
      if (requiresOAuth) {
        setActiveTab('connection')
      } else {
        setActiveTab('config')
      }
    }
  }, [isOpen, node?.id, requiresOAuth])

  // Fetch connection data when modal opens (only for OAuth nodes)
  useEffect(() => {
    if (isOpen && node && requiresOAuth) {
      fetchConnectionData()
    }
  }, [isOpen, node?.id, requiresOAuth])

  // Update connection status when nodeConnection changes (only for OAuth nodes)
  useEffect(() => {
    if (!node || !requiresOAuth) {
      setConnectionStatus({ connected: true, details: null }) // Non-OAuth nodes are always "ready"
      return
    }
    
    // Use connectionType for connection lookup (handles Gmail Read/Send → Gmail mapping)
    const connectionInfo = CONNECTIONS.find(c => c.title === connectionType)
    if (!connectionInfo) {
      setConnectionStatus({ connected: false, details: null })
      return
    }
    
    const { connectionKey, accessTokenKey, alwaysTrue } = connectionInfo
    const connectionData = (nodeConnection as any)[connectionKey]
    
    // Debug log
    console.log('Connection check:', { 
      serviceType,
      connectionType,
      displayTitle,
      connectionKey, 
      accessTokenKey, 
      connectionData,
      alwaysTrue 
    })
    
    const isConnected = alwaysTrue || 
      (connectionData && accessTokenKey && connectionData[accessTokenKey])
    
    setConnectionStatus({ 
      connected: !!isConnected, 
      details: connectionData 
    })
  }, [nodeConnection, node, serviceType, connectionType, displayTitle, requiresOAuth])

  const fetchConnectionData = async () => {
    if (!node) return
    setIsLoadingConnection(true)
    try {
      // Build a temporary state that matches what onConnections expects
      // IMPORTANT: onConnections checks against title like 'Discord', 'Slack', etc.
      // So we use node.type (serviceType) here, not the custom display title
      const tempState = {
        editor: {
          selectedNode: {
            data: {
              title: node.type  // Use node.type which is 'Discord', 'Slack', etc.
            }
          }
        }
      }
      await onConnections(nodeConnection, tempState as any, googleFile)
      
      // Also fetch Slack channels if this is a Slack node
      if (node.type === 'Slack' && nodeConnection.slackNode.slackAccessToken) {
        await fetchBotSlackChannels(nodeConnection.slackNode.slackAccessToken, setSlackChannels)
      }
    } catch (error) {
      console.error('Failed to fetch connection data:', error)
    } finally {
      setIsLoadingConnection(false)
    }
  }

  // Fetch Google Drive file when modal opens for Google Drive node
  useEffect(() => {
    if (isOpen && serviceType === 'Google Drive') {
      fetchGoogleDriveFile()
    }
  }, [isOpen, serviceType])

  const fetchGoogleDriveFile = async () => {
    setIsLoadingFile(true)
    try {
      const response = await axios.get('/api/drive')
      if (response?.data?.message?.files?.[0]) {
        setGoogleFile(response.data.message.files[0])
      }
    } catch (error: any) {
      console.error('Failed to fetch Google Drive files:', error)
      if (error?.response?.status === 401) {
        toast.error('Google Drive not connected')
      }
    } finally {
      setIsLoadingFile(false)
    }
  }

  if (!node) return null

  // Get connection info for current node type (use serviceType, not displayTitle)
  const connectionInfo = CONNECTIONS.find(c => c.title === serviceType)
  
  // @ts-ignore
  const nodeConnectionType: any = nodeConnection[nodeMapper[serviceType]]
  
  // Use state-tracked connection status
  const { connected, details } = connectionStatus

  const renderConnectionTab = () => (
    <div className="space-y-4">
      {/* Connection Status Card */}
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-neutral-800 p-2">
                <EditorCanvasIconHelper type={node.type} />
              </div>
              <div>
                <CardTitle className="text-base">{serviceType} Connection</CardTitle>
                <CardDescription className="text-xs">
                  {connectionInfo?.description || 'Configure your connection'}
                </CardDescription>
              </div>
            </div>
            {isLoadingConnection ? (
              <Badge className="bg-blue-500/20 text-blue-400">
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Checking...
              </Badge>
            ) : connected ? (
              <Badge className="bg-green-500/20 text-green-400">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="destructive" className="bg-red-500/20 text-red-400">
                <XCircle className="mr-1 h-3 w-3" />
                Not Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        
        {!connected && !isLoadingConnection && (
          <CardContent className="pt-0">
            <div className="rounded-lg border border-dashed border-neutral-700 bg-neutral-900 p-4 text-center">
              <p className="mb-3 text-sm text-neutral-400">
                Connect {serviceType} to use this node in your workflow
              </p>
              <div className="flex items-center justify-center gap-2">
                <Link href="/connections" target="_blank">
                  <Button size="sm" className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Go to Connections
                  </Button>
                </Link>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="gap-2"
                  onClick={fetchConnectionData}
                  disabled={isLoadingConnection}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoadingConnection ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        )}

        {connected && details && (
          <CardContent className="pt-0">
            <div className="space-y-2 text-sm">
              {serviceType === 'Discord' && details.webhookName && (
                <>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Webhook</span>
                    <span className="text-neutral-300">{details.webhookName}</span>
                  </div>
                  {details.guildName && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Server</span>
                      <span className="text-neutral-300">{details.guildName}</span>
                    </div>
                  )}
                </>
              )}
              {serviceType === 'Slack' && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Status</span>
                  <span className="text-neutral-300">Authenticated</span>
                </div>
              )}
              {serviceType === 'Notion' && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Workspace</span>
                  <span className="text-neutral-300">Connected</span>
                </div>
              )}
              {serviceType === 'Google Drive' && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Status</span>
                  <span className="text-neutral-300">Authenticated</span>
                </div>
              )}
              {serviceType === 'Google Calendar' && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Status</span>
                  <span className="text-neutral-300">Authenticated (via Google)</span>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Slack Channel Selection */}
      {serviceType === 'Slack' && connected && slackChannels?.length > 0 && (
        <Card className="border-neutral-800 bg-neutral-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Slack Channels</CardTitle>
            <CardDescription className="text-xs">
              Select channels to send notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MultipleSelector
              value={selectedSlackChannels}
              onChange={setSelectedSlackChannels}
              defaultOptions={slackChannels}
              placeholder="Select channels..."
              emptyIndicator={
                <p className="text-center text-sm text-neutral-500">
                  No channels found
                </p>
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  )

  // ============================================
  // Non-OAuth Node Configuration Renders
  // ============================================

  const renderWaitNodeConfig = () => (
    <div className="space-y-4">
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/20 p-2">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-base">Wait Duration</CardTitle>
              <CardDescription className="text-xs">
                Pause the workflow for a specified time
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label className="text-xs text-neutral-400">Duration</Label>
              <Input
                type="number"
                min={1}
                value={waitDuration.value}
                onChange={(e) => setWaitDuration(prev => ({ ...prev, value: parseInt(e.target.value) || 1 }))}
                className="mt-1 border-neutral-700 bg-neutral-800"
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-neutral-400">Unit</Label>
              <Select
                value={waitDuration.unit}
                onValueChange={(value) => setWaitDuration(prev => ({ ...prev, unit: value }))}
              >
                <SelectTrigger className="mt-1 border-neutral-700 bg-neutral-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="seconds">Seconds</SelectItem>
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-3">
            <p className="text-xs text-neutral-400">
              The workflow will pause for <span className="font-semibold text-amber-400">{waitDuration.value} {waitDuration.unit}</span> before continuing to the next node.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderConditionNodeConfig = () => (
    <div className="space-y-4">
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-500/20 p-2">
              <GitBranch className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-base">Condition Logic</CardTitle>
              <CardDescription className="text-xs">
                Define conditions to create branching paths
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-neutral-400">Field to Check</Label>
            <Input
              placeholder="e.g., fileName, fileType, etc."
              value={conditionConfig.field}
              onChange={(e) => setConditionConfig(prev => ({ ...prev, field: e.target.value }))}
              className="mt-1 border-neutral-700 bg-neutral-800"
            />
          </div>
          <div>
            <Label className="text-xs text-neutral-400">Operator</Label>
            <Select
              value={conditionConfig.operator}
              onValueChange={(value) => setConditionConfig(prev => ({ ...prev, operator: value }))}
            >
              <SelectTrigger className="mt-1 border-neutral-700 bg-neutral-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equals">Equals</SelectItem>
                <SelectItem value="not_equals">Not Equals</SelectItem>
                <SelectItem value="contains">Contains</SelectItem>
                <SelectItem value="not_contains">Not Contains</SelectItem>
                <SelectItem value="greater_than">Greater Than</SelectItem>
                <SelectItem value="less_than">Less Than</SelectItem>
                <SelectItem value="is_empty">Is Empty</SelectItem>
                <SelectItem value="is_not_empty">Is Not Empty</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-neutral-400">Value</Label>
            <Input
              placeholder="Value to compare against"
              value={conditionConfig.value}
              onChange={(e) => setConditionConfig(prev => ({ ...prev, value: e.target.value }))}
              className="mt-1 border-neutral-700 bg-neutral-800"
            />
          </div>
          <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-3">
            <p className="text-xs text-neutral-400">
              <span className="text-purple-400">If true:</span> Continues to the "Yes" path<br />
              <span className="text-purple-400">If false:</span> Continues to the "No" path
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  // AI Task presets for quick configuration
  const aiTaskPresets = {
    general: { name: 'General', prompt: '', systemPrompt: '' },
    summarize: { 
      name: 'Summarize', 
      prompt: 'Please summarize the following content concisely:\n\n{{fileContent}}',
      systemPrompt: 'You are a helpful assistant that creates clear, concise summaries.'
    },
    analyze: { 
      name: 'Analyze', 
      prompt: 'Please analyze the following content and provide key insights:\n\n{{fileContent}}',
      systemPrompt: 'You are an expert analyst. Provide thorough analysis with actionable insights.'
    },
    translate: { 
      name: 'Translate', 
      prompt: 'Translate the following content to [TARGET_LANGUAGE]:\n\n{{fileContent}}',
      systemPrompt: 'You are a professional translator. Maintain the original meaning and tone.'
    },
    extract: { 
      name: 'Extract Data', 
      prompt: 'Extract the following information from the content:\n- Key points\n- Names/entities\n- Dates\n- Numbers/metrics\n\nContent:\n{{fileContent}}',
      systemPrompt: 'You are a data extraction specialist. Extract information accurately and format it clearly.'
    },
    rewrite: { 
      name: 'Rewrite/Improve', 
      prompt: 'Please rewrite and improve the following content while maintaining its meaning:\n\n{{fileContent}}',
      systemPrompt: 'You are an expert editor. Improve clarity, grammar, and readability.'
    },
    generate: { 
      name: 'Generate Content', 
      prompt: 'Based on the following input, generate [CONTENT_TYPE]:\n\n{{fileContent}}',
      systemPrompt: 'You are a creative content generator. Create engaging and relevant content.'
    },
    classify: { 
      name: 'Classify/Categorize', 
      prompt: 'Classify the following content into appropriate categories:\n\n{{fileContent}}',
      systemPrompt: 'You are a classification expert. Categorize content accurately with confidence scores.'
    },
    sentiment: { 
      name: 'Sentiment Analysis', 
      prompt: 'Analyze the sentiment of the following content and provide:\n- Overall sentiment (positive/negative/neutral)\n- Confidence score\n- Key phrases contributing to sentiment\n\nContent:\n{{fileContent}}',
      systemPrompt: 'You are a sentiment analysis expert. Provide accurate sentiment classification with reasoning.'
    },
  }

  const handleAiPresetChange = (presetKey: string) => {
    const preset = aiTaskPresets[presetKey as keyof typeof aiTaskPresets]
    if (preset) {
      setAiConfig(prev => ({
        ...prev,
        taskType: presetKey,
        prompt: preset.prompt || prev.prompt,
        systemPrompt: preset.systemPrompt || prev.systemPrompt,
      }))
    }
  }

  const renderAINodeConfig = () => (
    <div className="space-y-4">
      {/* Model Selection Card */}
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 p-2">
              <Brain className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-base">AI Configuration</CardTitle>
              <CardDescription className="text-xs">
                Powered by Google Gemini AI
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Model Selection */}
          <div>
            <Label className="text-xs text-neutral-400">AI Model</Label>
            <Select
              value={aiConfig.model}
              onValueChange={(value) => setAiConfig(prev => ({ ...prev, model: value }))}
            >
              <SelectTrigger className="mt-1 border-neutral-700 bg-neutral-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini-2.0-flash">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Gemini 2.0 Flash</span>
                    <Badge className="bg-green-500/20 text-green-400 text-[10px]">Latest</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="gemini-2.0-flash-lite">
                  <div className="flex items-center gap-2">
                    <span>Gemini 2.0 Flash Lite</span>
                    <Badge className="bg-blue-500/20 text-blue-400 text-[10px]">Fast</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="gemini-2.5-flash">
                  <div className="flex items-center gap-2">
                    <span>Gemini 1.5 Pro</span>
                    <Badge className="bg-purple-500/20 text-purple-400 text-[10px]">Powerful</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="gemini-2.5-flash">
                  <div className="flex items-center gap-2">
                    <span>Gemini 2.5 Flash</span>
                    <Badge className="bg-amber-500/20 text-amber-400 text-[10px]">Balanced</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="gemini-2.5-flash-8b">
                  <div className="flex items-center gap-2">
                    <span>Gemini 2.5 Flash 8B</span>
                    <Badge className="bg-cyan-500/20 text-cyan-400 text-[10px]">Efficient</Badge>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1 text-[10px] text-neutral-500">
              {aiConfig.model === 'gemini-2.0-flash' && 'Most capable model with multimodal understanding'}
              {aiConfig.model === 'gemini-2.0-flash-lite' && 'Optimized for speed and cost efficiency'}
              {aiConfig.model === 'gemini-2.5-flash' && 'Best for complex reasoning and long context'}
              {aiConfig.model === 'gemini-2.5-flash' && 'Great balance of speed and capability'}
              {aiConfig.model === 'gemini-2.5-flash-8b' && 'Lightweight and fast for simple tasks'}
            </p>
          </div>

          {/* Task Type Preset */}
          <div>
            <Label className="text-xs text-neutral-400">Task Type</Label>
            <Select
              value={aiConfig.taskType}
              onValueChange={handleAiPresetChange}
            >
              <SelectTrigger className="mt-1 border-neutral-700 bg-neutral-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(aiTaskPresets).map(([key, preset]) => (
                  <SelectItem key={key} value={key}>{preset.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Advanced Settings Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-neutral-400">Temperature</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={aiConfig.temperature}
                  onChange={(e) => setAiConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                  className="flex-1 h-2 border-neutral-700 bg-neutral-800"
                />
                <span className="text-xs text-neutral-400 w-8">{aiConfig.temperature}</span>
              </div>
              <p className="text-[10px] text-neutral-500 mt-1">
                {aiConfig.temperature <= 0.3 ? 'Focused & deterministic' : aiConfig.temperature <= 0.7 ? 'Balanced' : 'Creative & varied'}
              </p>
            </div>
            <div>
              <Label className="text-xs text-neutral-400">Max Tokens</Label>
              <Select
                value={aiConfig.maxTokens.toString()}
                onValueChange={(value) => setAiConfig(prev => ({ ...prev, maxTokens: parseInt(value) }))}
              >
                <SelectTrigger className="mt-1 border-neutral-700 bg-neutral-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="512">512 (Short)</SelectItem>
                  <SelectItem value="1024">1024 (Medium)</SelectItem>
                  <SelectItem value="2048">2048 (Standard)</SelectItem>
                  <SelectItem value="4096">4096 (Long)</SelectItem>
                  <SelectItem value="8192">8192 (Extended)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Output Format */}
          <div>
            <Label className="text-xs text-neutral-400">Output Format</Label>
            <Select
              value={aiConfig.outputFormat}
              onValueChange={(value) => setAiConfig(prev => ({ ...prev, outputFormat: value }))}
            >
              <SelectTrigger className="mt-1 border-neutral-700 bg-neutral-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Plain Text</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="markdown">Markdown</SelectItem>
                <SelectItem value="bullet_points">Bullet Points</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Prompts Card */}
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Prompts</CardTitle>
          <CardDescription className="text-xs">
            Configure system behavior and user instructions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* System Prompt */}
          <div>
            <Label className="text-xs text-neutral-400">System Prompt (Optional)</Label>
            <Textarea
              placeholder="Define the AI's role and behavior. E.g., 'You are a helpful assistant that specializes in...'"
              value={aiConfig.systemPrompt}
              onChange={(e) => { setAiConfig(prev => ({ ...prev, systemPrompt: e.target.value })); setIsConfigSaved(false) }}
              className="mt-1 min-h-[80px] border-neutral-700 bg-neutral-800 text-sm"
            />
          </div>

          {/* Main Prompt */}
          <div>
            <Label className="text-xs text-neutral-400">User Prompt / Instructions</Label>
            <Textarea
              placeholder="Enter your AI prompt. Use variables like {{fileName}}, {{fileContent}} to reference trigger data..."
              value={aiConfig.prompt}
              onChange={(e) => { setAiConfig(prev => ({ ...prev, prompt: e.target.value })); setIsConfigSaved(false) }}
              className="mt-1 min-h-[120px] border-neutral-700 bg-neutral-800"
            />
          </div>

          {/* Variables Reference */}
          <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-3">
            <p className="text-xs font-medium text-neutral-300 mb-2">
              Available Variables {sourceNodeType && <span className="text-neutral-500">(from {sourceNodeType})</span>}:
            </p>
            <div className="flex flex-wrap gap-2">
              {availableVariables.map((variable) => (
                <Badge 
                  key={variable.name}
                  variant="outline" 
                  className="text-xs cursor-pointer hover:bg-neutral-800" 
                  title={variable.description}
                  onClick={() => { setAiConfig(prev => ({ ...prev, prompt: prev.prompt + variable.name })); setIsConfigSaved(false) }}
                >
                  {variable.name}
                </Badge>
              ))}
            </div>
            <p className="text-[10px] text-neutral-500 mt-2">Click a variable to add it to your prompt. Hover for description.</p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isConfigSaved ? (
            <Badge className="bg-green-500/20 text-green-400">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Saved
            </Badge>
          ) : (
            <Badge className="bg-amber-500/20 text-amber-400">
              <XCircle className="mr-1 h-3 w-3" />
              Unsaved Changes
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="gap-1"
          >
            <Eye className="h-4 w-4" />
            {showPreview ? 'Hide Preview' : 'Preview'}
          </Button>
          <Button
            size="sm"
            onClick={saveNodeConfig}
            disabled={isSavingConfig || isConfigSaved}
            className="gap-1"
          >
            {isSavingConfig ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Config
          </Button>
        </div>
      </div>

      {/* Execution Preview */}
      {showPreview && (
        <Card className="border-blue-500/30 bg-blue-900/10">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-400" />
              <CardTitle className="text-sm text-blue-400">Execution Preview</CardTitle>
            </div>
            <CardDescription className="text-xs">
              This is how the AI will be called when the workflow runs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Model Info */}
            <div className="rounded-lg bg-neutral-900 p-2">
              <p className="text-[10px] text-neutral-500 mb-1">Model</p>
              <p className="text-xs text-neutral-300">{aiConfig.model} (temp: {aiConfig.temperature}, max tokens: {aiConfig.maxTokens})</p>
            </div>

            {/* System Prompt Preview */}
            <div className="rounded-lg bg-neutral-900 p-2">
              <p className="text-[10px] text-neutral-500 mb-1">System Prompt</p>
              <pre className="text-xs text-green-400 whitespace-pre-wrap font-mono">
                {aiConfig.systemPrompt || (
                  <span className="text-neutral-500 italic">
                    {`(Auto-generated based on node title: "You are a helpful assistant. Process the following input and ${node?.data?.title || 'respond accordingly'}.")`}
                  </span>
                )}
              </pre>
            </div>

            {/* User Prompt Preview */}
            <div className="rounded-lg bg-neutral-900 p-2">
              <p className="text-[10px] text-neutral-500 mb-1">User Prompt (with sample data)</p>
              <pre className="text-xs text-blue-400 whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">
                {aiConfig.prompt ? 
                  aiConfig.prompt
                    .replace(/\{\{fileName\}\}/g, 'example-document.pdf')
                    .replace(/\{\{fileContent\}\}/g, '[Content of the file will appear here...]')
                    .replace(/\{\{timestamp\}\}/g, new Date().toISOString())
                    .replace(/\{\{previousOutput\}\}/g, '[Output from previous node]')
                    .replace(/\{\{triggerData\}\}/g, '{ "event": "file_changed", "fileName": "example.pdf" }')
                  : (
                    <span className="text-neutral-500 italic">
                      {`(Auto-generated: "Process the following data: {{triggerData}}")`}
                    </span>
                  )
                }
              </pre>
            </div>

            {/* Output Format */}
            <div className="rounded-lg bg-neutral-900 p-2">
              <p className="text-[10px] text-neutral-500 mb-1">Output Format</p>
              <p className="text-xs text-purple-400">{aiConfig.outputFormat}</p>
            </div>

            {/* Data Flow Explanation */}
            <div className="rounded-lg border border-dashed border-blue-500/30 bg-blue-900/20 p-3">
              <p className="text-xs font-medium text-blue-300 mb-2">📊 Data Flow</p>
              <ol className="text-[10px] text-neutral-400 space-y-1 list-decimal list-inside">
                <li>Trigger data (e.g., Google Drive file) arrives at this node</li>
                <li>Variables like <code className="text-blue-400">{"{{fileName}}"}</code> are replaced with actual values</li>
                <li>AI processes with system prompt + user prompt</li>
                <li>Output is passed to the next node as <code className="text-green-400">{"{{previousOutput}}"}</code></li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips Card */}
      <Card className="border-neutral-800 bg-gradient-to-br from-blue-900/20 to-purple-900/20">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <Brain className="h-4 w-4 text-blue-400 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-neutral-300">Pro Tips</p>
              <ul className="text-[10px] text-neutral-400 mt-1 space-y-1">
                <li>• Use <span className="text-blue-400">Gemini 2.0 Flash</span> for the best overall performance</li>
                <li>• Lower temperature (0.1-0.3) for factual tasks, higher (0.7-1.0) for creative tasks</li>
                <li>• System prompts help define consistent AI behavior across requests</li>
                <li>• Use JSON output format when you need structured data for other nodes</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderEmailNodeConfig = () => (
    <div className="space-y-4">
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-500/20 p-2">
              <Mail className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <CardTitle className="text-base">Email Configuration</CardTitle>
              <CardDescription className="text-xs">
                Configure email to send when triggered
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-neutral-400">To (Recipient)</Label>
            <Input
              type="email"
              placeholder="recipient@example.com"
              value={emailConfig.to}
              onChange={(e) => setEmailConfig(prev => ({ ...prev, to: e.target.value }))}
              className="mt-1 border-neutral-700 bg-neutral-800"
            />
          </div>
          <div>
            <Label className="text-xs text-neutral-400">Subject</Label>
            <Input
              placeholder="Email subject line"
              value={emailConfig.subject}
              onChange={(e) => setEmailConfig(prev => ({ ...prev, subject: e.target.value }))}
              className="mt-1 border-neutral-700 bg-neutral-800"
            />
          </div>
          <div>
            <Label className="text-xs text-neutral-400">Body</Label>
            <Textarea
              placeholder="Email body content..."
              value={emailConfig.body}
              onChange={(e) => setEmailConfig(prev => ({ ...prev, body: e.target.value }))}
              className="mt-1 min-h-[100px] border-neutral-700 bg-neutral-800"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderTriggerNodeConfig = () => (
    <div className="space-y-4">
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-500/20 p-2">
              <Play className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <CardTitle className="text-base">Trigger Configuration</CardTitle>
              <CardDescription className="text-xs">
                This is the starting point of your workflow
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-dashed border-neutral-700 bg-neutral-900 p-4 text-center">
            <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-400" />
            <p className="text-sm font-medium text-neutral-300">Trigger Ready</p>
            <p className="mt-1 text-xs text-neutral-500">
              This trigger node will start the workflow when an event occurs.
            </p>
          </div>
          <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-3">
            <p className="text-xs text-neutral-400">
              <span className="text-orange-400 font-medium">Tip:</span> Connect a Google Drive node to trigger on file changes, or use a Custom Webhook to trigger via API.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderCustomWebhookConfig = () => (
    <div className="space-y-4">
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-pink-500/20 p-2">
              <Webhook className="h-5 w-5 text-pink-400" />
            </div>
            <div>
              <CardTitle className="text-base">Custom Webhook</CardTitle>
              <CardDescription className="text-xs">
                Send data to any external API endpoint
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-neutral-400">Webhook URL</Label>
            <Input
              type="url"
              placeholder="https://api.example.com/webhook"
              value={webhookConfig.url}
              onChange={(e) => setWebhookConfig(prev => ({ ...prev, url: e.target.value }))}
              className="mt-1 border-neutral-700 bg-neutral-800"
            />
          </div>
          <div>
            <Label className="text-xs text-neutral-400">HTTP Method</Label>
            <Select
              value={webhookConfig.method}
              onValueChange={(value) => setWebhookConfig(prev => ({ ...prev, method: value }))}
            >
              <SelectTrigger className="mt-1 border-neutral-700 bg-neutral-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-neutral-400">Headers (JSON)</Label>
            <Textarea
              placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
              value={webhookConfig.headers}
              onChange={(e) => setWebhookConfig(prev => ({ ...prev, headers: e.target.value }))}
              className="mt-1 min-h-[80px] font-mono text-xs border-neutral-700 bg-neutral-800"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderGoogleCalendarConfig = () => (
    <div className="space-y-4">
      {/* Action Type Selection */}
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-500/20 to-green-500/20 p-2">
              <Calendar className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-base">Google Calendar</CardTitle>
              <CardDescription className="text-xs">
                Read, create, or manage calendar events
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Action Type */}
          <div>
            <Label className="text-xs text-neutral-400">Action Type</Label>
            <Select
              value={calendarConfig.action}
              onValueChange={(value) => setCalendarConfig(prev => ({ ...prev, action: value }))}
            >
              <SelectTrigger className="mt-1 border-neutral-700 bg-neutral-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="create">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">●</span> Create Event
                  </div>
                </SelectItem>
                <SelectItem value="read">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400">●</span> Read Events
                  </div>
                </SelectItem>
                <SelectItem value="update">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400">●</span> Update Event
                  </div>
                </SelectItem>
                <SelectItem value="delete">
                  <div className="flex items-center gap-2">
                    <span className="text-red-400">●</span> Delete Event
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* READ Actions Configuration */}
      {calendarConfig.action === 'read' && (
        <Card className="border-neutral-800 bg-neutral-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-blue-400">📖</span> Read Calendar Events
            </CardTitle>
            <CardDescription className="text-xs">
              Fetch events from your calendar to use in workflow
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Read Action Type */}
            <div>
              <Label className="text-xs text-neutral-400">What to Read</Label>
              <Select
                value={calendarConfig.readAction}
                onValueChange={(value) => setCalendarConfig(prev => ({ ...prev, readAction: value }))}
              >
                <SelectTrigger className="mt-1 border-neutral-700 bg-neutral-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="list">List Upcoming Events</SelectItem>
                  <SelectItem value="today">Today's Events</SelectItem>
                  <SelectItem value="upcoming">Next 24 Hours</SelectItem>
                  <SelectItem value="search">Search Events</SelectItem>
                  <SelectItem value="get">Get Specific Event</SelectItem>
                  <SelectItem value="freebusy">Check Free/Busy</SelectItem>
                  <SelectItem value="calendars">List All Calendars</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search Query (for search action) */}
            {calendarConfig.readAction === 'search' && (
              <div>
                <Label className="text-xs text-neutral-400">Search Query</Label>
                <Input
                  placeholder="Meeting, standup, review..."
                  value={calendarConfig.searchQuery}
                  onChange={(e) => setCalendarConfig(prev => ({ ...prev, searchQuery: e.target.value }))}
                  className="mt-1 border-neutral-700 bg-neutral-800"
                />
              </div>
            )}

            {/* Event ID (for get specific event) */}
            {calendarConfig.readAction === 'get' && (
              <div>
                <Label className="text-xs text-neutral-400">Event ID</Label>
                <Input
                  placeholder="Enter event ID or use {{previousOutput.eventId}}"
                  value={calendarConfig.eventId}
                  onChange={(e) => setCalendarConfig(prev => ({ ...prev, eventId: e.target.value }))}
                  className="mt-1 font-mono text-xs border-neutral-700 bg-neutral-800"
                />
              </div>
            )}

            {/* Max Results */}
            {['list', 'search', 'today', 'upcoming'].includes(calendarConfig.readAction) && (
              <div>
                <Label className="text-xs text-neutral-400">Max Results</Label>
                <Select
                  value={calendarConfig.maxResults.toString()}
                  onValueChange={(value) => setCalendarConfig(prev => ({ ...prev, maxResults: parseInt(value) }))}
                >
                  <SelectTrigger className="mt-1 border-neutral-700 bg-neutral-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 events</SelectItem>
                    <SelectItem value="10">10 events</SelectItem>
                    <SelectItem value="25">25 events</SelectItem>
                    <SelectItem value="50">50 events</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Calendar Selection */}
            <div>
              <Label className="text-xs text-neutral-400">Calendar</Label>
              <Input
                placeholder="primary (or calendar ID)"
                value={calendarConfig.calendarId}
                onChange={(e) => setCalendarConfig(prev => ({ ...prev, calendarId: e.target.value }))}
                className="mt-1 border-neutral-700 bg-neutral-800"
              />
              <p className="mt-1 text-[10px] text-neutral-500">
                Use "primary" for main calendar, or use Read "List All Calendars" first
              </p>
            </div>

            {/* Output Reference */}
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
              <p className="text-xs font-medium text-blue-300 mb-2">Output Data Available:</p>
              <div className="text-[10px] text-neutral-400 font-mono space-y-1">
                <p>{"{{events}}"} - Array of events</p>
                <p>{"{{events[0].summary}}"} - Event title</p>
                <p>{"{{events[0].start.dateTime}}"} - Start time</p>
                <p>{"{{events[0].attendees}}"} - Attendees list</p>
                <p>{"{{events[0].htmlLink}}"} - Link to event</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CREATE Event Configuration */}
      {calendarConfig.action === 'create' && (
        <Card className="border-neutral-800 bg-neutral-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-green-400">✚</span> Create Calendar Event
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Event Title */}
            <div>
              <Label className="text-xs text-neutral-400">Event Title *</Label>
              <Input
                placeholder="Team Standup Meeting"
                value={calendarConfig.title}
                onChange={(e) => setCalendarConfig(prev => ({ ...prev, title: e.target.value }))}
                className="mt-1 border-neutral-700 bg-neutral-800"
              />
            </div>

            {/* Description */}
            <div>
              <Label className="text-xs text-neutral-400">Description</Label>
              <Textarea
                placeholder="Meeting agenda and notes..."
                value={calendarConfig.description}
                onChange={(e) => setCalendarConfig(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1 min-h-[80px] border-neutral-700 bg-neutral-800"
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-neutral-400">Date *</Label>
                <Input
                  type="date"
                  value={calendarConfig.date}
                  onChange={(e) => setCalendarConfig(prev => ({ ...prev, date: e.target.value }))}
                  className="mt-1 border-neutral-700 bg-neutral-800"
                />
              </div>
              <div>
                <Label className="text-xs text-neutral-400">Start Time *</Label>
                <Input
                  type="time"
                  value={calendarConfig.time}
                  onChange={(e) => setCalendarConfig(prev => ({ ...prev, time: e.target.value }))}
                  className="mt-1 border-neutral-700 bg-neutral-800"
                />
              </div>
            </div>

            {/* Duration and Timezone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-neutral-400">Duration</Label>
                <Select
                  value={calendarConfig.duration.toString()}
                  onValueChange={(value) => setCalendarConfig(prev => ({ ...prev, duration: parseInt(value) }))}
                >
                  <SelectTrigger className="mt-1 border-neutral-700 bg-neutral-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-neutral-400">Timezone</Label>
                <Select
                  value={calendarConfig.timeZone}
                  onValueChange={(value) => setCalendarConfig(prev => ({ ...prev, timeZone: value }))}
                >
                  <SelectTrigger className="mt-1 border-neutral-700 bg-neutral-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">Eastern (ET)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific (PT)</SelectItem>
                    <SelectItem value="Europe/London">London (GMT)</SelectItem>
                    <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Location */}
            <div>
              <Label className="text-xs text-neutral-400">Location</Label>
              <Input
                placeholder="Conference Room or https://meet.google.com/..."
                value={calendarConfig.location}
                onChange={(e) => setCalendarConfig(prev => ({ ...prev, location: e.target.value }))}
                className="mt-1 border-neutral-700 bg-neutral-800"
              />
            </div>

            {/* Attendees */}
            <div>
              <Label className="text-xs text-neutral-400">Attendees</Label>
              <Input
                placeholder="john@example.com, jane@example.com"
                value={calendarConfig.attendees}
                onChange={(e) => setCalendarConfig(prev => ({ ...prev, attendees: e.target.value }))}
                className="mt-1 border-neutral-700 bg-neutral-800"
              />
            </div>

            {/* Reminder */}
            <div>
              <Label className="text-xs text-neutral-400">Reminder</Label>
              <Select
                value={calendarConfig.reminder.toString()}
                onValueChange={(value) => setCalendarConfig(prev => ({ ...prev, reminder: parseInt(value) }))}
              >
                <SelectTrigger className="mt-1 border-neutral-700 bg-neutral-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No reminder</SelectItem>
                  <SelectItem value="10">10 minutes before</SelectItem>
                  <SelectItem value="30">30 minutes before</SelectItem>
                  <SelectItem value="60">1 hour before</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* UPDATE Event Configuration */}
      {calendarConfig.action === 'update' && (
        <Card className="border-neutral-800 bg-neutral-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-amber-400">✎</span> Update Calendar Event
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-neutral-400">Event ID to Update *</Label>
              <Input
                placeholder="Event ID or {{previousOutput.eventId}}"
                value={calendarConfig.eventId}
                onChange={(e) => setCalendarConfig(prev => ({ ...prev, eventId: e.target.value }))}
                className="mt-1 font-mono text-xs border-neutral-700 bg-neutral-800"
              />
            </div>
            
            <Separator className="border-neutral-700" />
            
            <p className="text-xs text-neutral-400">Fields to update (leave empty to keep unchanged):</p>
            
            <div>
              <Label className="text-xs text-neutral-400">New Title</Label>
              <Input
                placeholder="New event title"
                value={calendarConfig.title}
                onChange={(e) => setCalendarConfig(prev => ({ ...prev, title: e.target.value }))}
                className="mt-1 border-neutral-700 bg-neutral-800"
              />
            </div>

            <div>
              <Label className="text-xs text-neutral-400">New Description</Label>
              <Textarea
                placeholder="Updated description..."
                value={calendarConfig.description}
                onChange={(e) => setCalendarConfig(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1 min-h-[60px] border-neutral-700 bg-neutral-800"
              />
            </div>

            <div>
              <Label className="text-xs text-neutral-400">New Location</Label>
              <Input
                placeholder="New location"
                value={calendarConfig.location}
                onChange={(e) => setCalendarConfig(prev => ({ ...prev, location: e.target.value }))}
                className="mt-1 border-neutral-700 bg-neutral-800"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* DELETE Event Configuration */}
      {calendarConfig.action === 'delete' && (
        <Card className="border-neutral-800 bg-neutral-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-red-400">✕</span> Delete Calendar Event
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-neutral-400">Event ID to Delete *</Label>
              <Input
                placeholder="Event ID or {{previousOutput.eventId}}"
                value={calendarConfig.eventId}
                onChange={(e) => setCalendarConfig(prev => ({ ...prev, eventId: e.target.value }))}
                className="mt-1 font-mono text-xs border-neutral-700 bg-neutral-800"
              />
            </div>

            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <p className="text-xs text-red-300">
                ⚠️ This action will permanently delete the event and notify attendees.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Variables Reference */}
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardContent className="p-3">
          <p className="text-xs font-medium text-neutral-300 mb-2">Available Variables:</p>
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-xs cursor-pointer hover:bg-neutral-800" onClick={() => setCalendarConfig(prev => ({ ...prev, title: prev.title + '{{fileName}}' }))}>{"{{fileName}}"}</Badge>
            <Badge variant="outline" className="text-xs cursor-pointer hover:bg-neutral-800" onClick={() => setCalendarConfig(prev => ({ ...prev, description: prev.description + '{{previousOutput}}' }))}>{"{{previousOutput}}"}</Badge>
            <Badge variant="outline" className="text-xs cursor-pointer hover:bg-neutral-800" onClick={() => setCalendarConfig(prev => ({ ...prev, title: prev.title + '{{timestamp}}' }))}>{"{{timestamp}}"}</Badge>
            <Badge variant="outline" className="text-xs cursor-pointer hover:bg-neutral-800" onClick={() => setCalendarConfig(prev => ({ ...prev, eventId: '{{previousOutput.events[0].id}}' }))}>{"{{events[0].id}}"}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="border-neutral-800 bg-gradient-to-br from-blue-900/20 to-green-900/20">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-blue-400 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-neutral-300">Use Cases</p>
              <ul className="text-[10px] text-neutral-400 mt-1 space-y-1">
                <li>• <span className="text-blue-400">Read → AI → Slack</span>: Get today's meetings and send summary to Slack</li>
                <li>• <span className="text-green-400">Trigger → Create</span>: Auto-create follow-up meetings from Drive changes</li>
                <li>• <span className="text-amber-400">Read → Condition → Email</span>: Alert if no meetings scheduled today</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  // ============================================
  // Gmail Read Configuration
  // ============================================

  const renderGmailReadConfig = () => (
    <div className="space-y-4">
      {/* Header Card */}
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-red-500/20 to-yellow-500/20 p-2">
              <Mail className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <CardTitle className="text-base">Gmail Read</CardTitle>
              <CardDescription className="text-xs">
                Fetch and filter emails from your Gmail inbox
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Read Action Type */}
          <div>
            <Label className="text-xs text-neutral-400">Read Action</Label>
            <Select
              value={gmailReadConfig.action}
              onValueChange={(value) => setGmailReadConfig(prev => ({ ...prev, action: value }))}
            >
              <SelectTrigger className="mt-1 border-neutral-700 bg-neutral-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="list">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400">●</span> List Emails (with filters)
                  </div>
                </SelectItem>
                <SelectItem value="get">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">●</span> Get Specific Email
                  </div>
                </SelectItem>
                <SelectItem value="thread">
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400">●</span> Get Email Thread
                  </div>
                </SelectItem>
                <SelectItem value="labels">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400">●</span> List All Labels
                  </div>
                </SelectItem>
                <SelectItem value="profile">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400">●</span> Get Account Profile
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* List Emails with Filters */}
      {gmailReadConfig.action === 'list' && (
        <Card className="border-neutral-800 bg-neutral-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-blue-400">📬</span> Filter Emails
            </CardTitle>
            <CardDescription className="text-xs">
              Set filters to narrow down which emails to fetch
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Max Results */}
            <div>
              <Label className="text-xs text-neutral-400">Max Results</Label>
              <Select
                value={gmailReadConfig.maxResults.toString()}
                onValueChange={(value) => setGmailReadConfig(prev => ({ ...prev, maxResults: parseInt(value) }))}
              >
                <SelectTrigger className="mt-1 border-neutral-700 bg-neutral-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 emails</SelectItem>
                  <SelectItem value="10">10 emails</SelectItem>
                  <SelectItem value="20">20 emails</SelectItem>
                  <SelectItem value="50">50 emails</SelectItem>
                  <SelectItem value="100">100 emails</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* From Filter */}
            <div>
              <Label className="text-xs text-neutral-400">From (sender email)</Label>
              <Input
                placeholder="john@example.com"
                value={gmailReadConfig.from}
                onChange={(e) => setGmailReadConfig(prev => ({ ...prev, from: e.target.value }))}
                className="mt-1 border-neutral-700 bg-neutral-800"
              />
            </div>

            {/* To Filter */}
            <div>
              <Label className="text-xs text-neutral-400">To (recipient)</Label>
              <Input
                placeholder="me@example.com"
                value={gmailReadConfig.to}
                onChange={(e) => setGmailReadConfig(prev => ({ ...prev, to: e.target.value }))}
                className="mt-1 border-neutral-700 bg-neutral-800"
              />
            </div>

            {/* Subject Filter */}
            <div>
              <Label className="text-xs text-neutral-400">Subject Contains</Label>
              <Input
                placeholder="Invoice, Report, Meeting..."
                value={gmailReadConfig.subject}
                onChange={(e) => setGmailReadConfig(prev => ({ ...prev, subject: e.target.value }))}
                className="mt-1 border-neutral-700 bg-neutral-800"
              />
            </div>

            {/* Label Filter */}
            <div>
              <Label className="text-xs text-neutral-400">Label</Label>
              <Select
                value={gmailReadConfig.label}
                onValueChange={(value) => setGmailReadConfig(prev => ({ ...prev, label: value === 'all' ? '' : value }))}
              >
                <SelectTrigger className="mt-1 border-neutral-700 bg-neutral-800">
                  <SelectValue placeholder="All labels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Labels</SelectItem>
                  <SelectItem value="INBOX">Inbox</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                  <SelectItem value="IMPORTANT">Important</SelectItem>
                  <SelectItem value="STARRED">Starred</SelectItem>
                  <SelectItem value="DRAFT">Drafts</SelectItem>
                  <SelectItem value="SPAM">Spam</SelectItem>
                  <SelectItem value="TRASH">Trash</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-neutral-400">After Date</Label>
                <Input
                  type="date"
                  value={gmailReadConfig.after}
                  onChange={(e) => setGmailReadConfig(prev => ({ ...prev, after: e.target.value }))}
                  className="mt-1 border-neutral-700 bg-neutral-800"
                />
              </div>
              <div>
                <Label className="text-xs text-neutral-400">Before Date</Label>
                <Input
                  type="date"
                  value={gmailReadConfig.before}
                  onChange={(e) => setGmailReadConfig(prev => ({ ...prev, before: e.target.value }))}
                  className="mt-1 border-neutral-700 bg-neutral-800"
                />
              </div>
            </div>

            {/* Boolean Filters */}
            <div className="flex flex-wrap gap-2">
              <Badge 
                variant={gmailReadConfig.isUnread ? "default" : "outline"} 
                className="cursor-pointer"
                onClick={() => setGmailReadConfig(prev => ({ ...prev, isUnread: !prev.isUnread }))}
              >
                {gmailReadConfig.isUnread ? '✓' : ''} Unread Only
              </Badge>
              <Badge 
                variant={gmailReadConfig.isStarred ? "default" : "outline"} 
                className="cursor-pointer"
                onClick={() => setGmailReadConfig(prev => ({ ...prev, isStarred: !prev.isStarred }))}
              >
                {gmailReadConfig.isStarred ? '✓' : ''} Starred Only
              </Badge>
              <Badge 
                variant={gmailReadConfig.hasAttachment ? "default" : "outline"} 
                className="cursor-pointer"
                onClick={() => setGmailReadConfig(prev => ({ ...prev, hasAttachment: !prev.hasAttachment }))}
              >
                {gmailReadConfig.hasAttachment ? '✓' : ''} Has Attachment
              </Badge>
            </div>

            {/* Custom Query */}
            <div>
              <Label className="text-xs text-neutral-400">Custom Gmail Query (Advanced)</Label>
              <Input
                placeholder="from:newsletter@* OR is:important"
                value={gmailReadConfig.query}
                onChange={(e) => setGmailReadConfig(prev => ({ ...prev, query: e.target.value }))}
                className="mt-1 font-mono text-xs border-neutral-700 bg-neutral-800"
              />
              <p className="text-[10px] text-neutral-500 mt-1">
                Uses Gmail search syntax. Overrides other filters if specified.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Get Specific Email */}
      {gmailReadConfig.action === 'get' && (
        <Card className="border-neutral-800 bg-neutral-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-green-400">📧</span> Get Specific Email
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-neutral-400">Message ID *</Label>
              <Input
                placeholder="Message ID or {{previousOutput.emails[0].id}}"
                value={gmailReadConfig.messageId}
                onChange={(e) => setGmailReadConfig(prev => ({ ...prev, messageId: e.target.value }))}
                className="mt-1 font-mono text-xs border-neutral-700 bg-neutral-800"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Get Email Thread */}
      {gmailReadConfig.action === 'thread' && (
        <Card className="border-neutral-800 bg-neutral-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-purple-400">💬</span> Get Email Thread
            </CardTitle>
            <CardDescription className="text-xs">
              Fetch all messages in a conversation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-neutral-400">Thread ID *</Label>
              <Input
                placeholder="Thread ID or {{previousOutput.emails[0].threadId}}"
                value={gmailReadConfig.threadId}
                onChange={(e) => setGmailReadConfig(prev => ({ ...prev, threadId: e.target.value }))}
                className="mt-1 font-mono text-xs border-neutral-700 bg-neutral-800"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Variables Reference */}
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardContent className="p-3">
          <p className="text-xs font-medium text-neutral-300 mb-2">Output Variables:</p>
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-xs font-mono">{"{{emails}}"}</Badge>
            <Badge variant="outline" className="text-xs font-mono">{"{{emails[0].id}}"}</Badge>
            <Badge variant="outline" className="text-xs font-mono">{"{{emails[0].from}}"}</Badge>
            <Badge variant="outline" className="text-xs font-mono">{"{{emails[0].subject}}"}</Badge>
            <Badge variant="outline" className="text-xs font-mono">{"{{emails[0].bodyText}}"}</Badge>
            <Badge variant="outline" className="text-xs font-mono">{"{{emails[0].threadId}}"}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="border-neutral-800 bg-gradient-to-br from-red-900/20 to-amber-900/20">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <Mail className="h-4 w-4 text-red-400 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-neutral-300">Use Cases</p>
              <ul className="text-[10px] text-neutral-400 mt-1 space-y-1">
                <li>• <span className="text-blue-400">Gmail Read → AI → Google Docs</span>: Summarize emails to a doc</li>
                <li>• <span className="text-green-400">Gmail Read → Condition → Slack</span>: Alert on important emails</li>
                <li>• <span className="text-amber-400">Gmail Read → Data Filter → Notion</span>: Archive invoices to database</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  // ============================================
  // Gmail Send Configuration
  // ============================================

  const renderGmailSendConfig = () => (
    <div className="space-y-4">
      {/* Header Card */}
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-red-500/20 to-blue-500/20 p-2">
              <Mail className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <CardTitle className="text-base">Gmail Send</CardTitle>
              <CardDescription className="text-xs">
                Send emails, create drafts, or reply to threads
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Send Action Type */}
          <div>
            <Label className="text-xs text-neutral-400">Action</Label>
            <Select
              value={gmailSendConfig.action}
              onValueChange={(value) => setGmailSendConfig(prev => ({ ...prev, action: value }))}
            >
              <SelectTrigger className="mt-1 border-neutral-700 bg-neutral-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="send">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">●</span> Send Email
                  </div>
                </SelectItem>
                <SelectItem value="draft">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400">●</span> Create Draft
                  </div>
                </SelectItem>
                <SelectItem value="reply">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400">●</span> Reply to Email
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Send/Draft Configuration */}
      {(gmailSendConfig.action === 'send' || gmailSendConfig.action === 'draft') && (
        <Card className="border-neutral-800 bg-neutral-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {gmailSendConfig.action === 'send' ? (
                <><span className="text-green-400">📤</span> Compose Email</>
              ) : (
                <><span className="text-amber-400">📝</span> Create Draft</>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* To */}
            <div>
              <Label className="text-xs text-neutral-400">To *</Label>
              <Input
                placeholder="recipient@example.com (comma-separated for multiple)"
                value={gmailSendConfig.to}
                onChange={(e) => setGmailSendConfig(prev => ({ ...prev, to: e.target.value }))}
                className="mt-1 border-neutral-700 bg-neutral-800"
              />
            </div>

            {/* CC & BCC */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-neutral-400">CC</Label>
                <Input
                  placeholder="cc@example.com"
                  value={gmailSendConfig.cc}
                  onChange={(e) => setGmailSendConfig(prev => ({ ...prev, cc: e.target.value }))}
                  className="mt-1 border-neutral-700 bg-neutral-800"
                />
              </div>
              <div>
                <Label className="text-xs text-neutral-400">BCC</Label>
                <Input
                  placeholder="bcc@example.com"
                  value={gmailSendConfig.bcc}
                  onChange={(e) => setGmailSendConfig(prev => ({ ...prev, bcc: e.target.value }))}
                  className="mt-1 border-neutral-700 bg-neutral-800"
                />
              </div>
            </div>

            {/* Subject */}
            <div>
              <Label className="text-xs text-neutral-400">Subject *</Label>
              <Input
                placeholder="Email subject line"
                value={gmailSendConfig.subject}
                onChange={(e) => setGmailSendConfig(prev => ({ ...prev, subject: e.target.value }))}
                className="mt-1 border-neutral-700 bg-neutral-800"
              />
            </div>

            {/* Format Toggle */}
            <div className="flex items-center gap-2">
              <Badge 
                variant={!gmailSendConfig.useHtml ? "default" : "outline"} 
                className="cursor-pointer"
                onClick={() => setGmailSendConfig(prev => ({ ...prev, useHtml: false }))}
              >
                Plain Text
              </Badge>
              <Badge 
                variant={gmailSendConfig.useHtml ? "default" : "outline"} 
                className="cursor-pointer"
                onClick={() => setGmailSendConfig(prev => ({ ...prev, useHtml: true }))}
              >
                HTML
              </Badge>
            </div>

            {/* Body */}
            {!gmailSendConfig.useHtml ? (
              <div>
                <Label className="text-xs text-neutral-400">Body (Plain Text)</Label>
                <Textarea
                  placeholder="Email body content..."
                  value={gmailSendConfig.bodyText}
                  onChange={(e) => setGmailSendConfig(prev => ({ ...prev, bodyText: e.target.value }))}
                  className="mt-1 min-h-[120px] border-neutral-700 bg-neutral-800"
                />
              </div>
            ) : (
              <div>
                <Label className="text-xs text-neutral-400">Body (HTML)</Label>
                <Textarea
                  placeholder="<p>Your HTML email content...</p>"
                  value={gmailSendConfig.bodyHtml}
                  onChange={(e) => setGmailSendConfig(prev => ({ ...prev, bodyHtml: e.target.value }))}
                  className="mt-1 min-h-[120px] font-mono text-xs border-neutral-700 bg-neutral-800"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reply Configuration */}
      {gmailSendConfig.action === 'reply' && (
        <Card className="border-neutral-800 bg-neutral-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-blue-400">↩️</span> Reply to Email
            </CardTitle>
            <CardDescription className="text-xs">
              Reply to an existing email thread
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Message ID to reply to */}
            <div>
              <Label className="text-xs text-neutral-400">Message ID to Reply To *</Label>
              <Input
                placeholder="Message ID or {{previousOutput.emails[0].id}}"
                value={gmailSendConfig.replyToMessageId}
                onChange={(e) => setGmailSendConfig(prev => ({ ...prev, replyToMessageId: e.target.value }))}
                className="mt-1 font-mono text-xs border-neutral-700 bg-neutral-800"
              />
            </div>

            {/* Reply Body */}
            <div>
              <Label className="text-xs text-neutral-400">Reply Message *</Label>
              <Textarea
                placeholder="Your reply message..."
                value={gmailSendConfig.bodyText}
                onChange={(e) => setGmailSendConfig(prev => ({ ...prev, bodyText: e.target.value }))}
                className="mt-1 min-h-[100px] border-neutral-700 bg-neutral-800"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Variables Reference */}
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardContent className="p-3">
          <p className="text-xs font-medium text-neutral-300 mb-2">
            Available Variables {sourceNodeType && <span className="text-neutral-500">(from {sourceNodeType})</span>}:
          </p>
          <div className="flex flex-wrap gap-1">
            {availableVariables.map((variable) => (
              <Badge 
                key={variable.name}
                variant="outline" 
                className="text-xs cursor-pointer hover:bg-neutral-800"
                title={variable.description}
                onClick={() => setGmailSendConfig(prev => ({ ...prev, bodyText: prev.bodyText + variable.name }))}
              >
                {variable.name}
              </Badge>
            ))}
          </div>
          <p className="text-[10px] text-neutral-500 mt-2">Click to add to email body. Hover for description.</p>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="border-neutral-800 bg-gradient-to-br from-red-900/20 to-blue-900/20">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <Mail className="h-4 w-4 text-red-400 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-neutral-300">Use Cases</p>
              <ul className="text-[10px] text-neutral-400 mt-1 space-y-1">
                <li>• <span className="text-blue-400">Gmail Read → AI → Gmail Send</span>: Auto-reply with AI-generated response</li>
                <li>• <span className="text-green-400">Schedule Trigger → Gmail Send</span>: Send weekly digest emails</li>
                <li>• <span className="text-amber-400">Notion → Gmail Send</span>: Email when new item added to database</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  // ============================================
  // New Node Configuration Renders
  // ============================================

  const renderHTTPRequestConfig = () => (
    <div className="space-y-4">
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/20 p-2">
              <Zap className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-base">HTTP Request</CardTitle>
              <CardDescription className="text-xs">
                Make API calls to external services
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="w-28">
              <Label className="text-xs text-neutral-400">Method</Label>
              <Select
                value={httpRequestConfig.method}
                onValueChange={(value) => setHttpRequestConfig(prev => ({ ...prev, method: value }))}
              >
                <SelectTrigger className="mt-1 border-neutral-700 bg-neutral-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET"><span className="text-green-400">GET</span></SelectItem>
                  <SelectItem value="POST"><span className="text-blue-400">POST</span></SelectItem>
                  <SelectItem value="PUT"><span className="text-amber-400">PUT</span></SelectItem>
                  <SelectItem value="PATCH"><span className="text-purple-400">PATCH</span></SelectItem>
                  <SelectItem value="DELETE"><span className="text-red-400">DELETE</span></SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-xs text-neutral-400">URL</Label>
              <Input
                placeholder="https://api.example.com/endpoint"
                value={httpRequestConfig.url}
                onChange={(e) => setHttpRequestConfig(prev => ({ ...prev, url: e.target.value }))}
                className="mt-1 border-neutral-700 bg-neutral-800"
              />
            </div>
          </div>

          {/* Authentication */}
          <div>
            <Label className="text-xs text-neutral-400">Authentication</Label>
            <Select
              value={httpRequestConfig.authType}
              onValueChange={(value) => setHttpRequestConfig(prev => ({ ...prev, authType: value }))}
            >
              <SelectTrigger className="mt-1 border-neutral-700 bg-neutral-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Authentication</SelectItem>
                <SelectItem value="bearer">Bearer Token</SelectItem>
                <SelectItem value="api_key">API Key (Header)</SelectItem>
                <SelectItem value="basic">Basic Auth</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {httpRequestConfig.authType !== 'none' && (
            <div>
              <Label className="text-xs text-neutral-400">
                {httpRequestConfig.authType === 'bearer' && 'Bearer Token'}
                {httpRequestConfig.authType === 'api_key' && 'API Key'}
                {httpRequestConfig.authType === 'basic' && 'Credentials (user:pass)'}
              </Label>
              <Input
                type="password"
                placeholder={
                  httpRequestConfig.authType === 'bearer' ? 'sk-xxxx...' :
                  httpRequestConfig.authType === 'api_key' ? 'your-api-key' :
                  'username:password'
                }
                value={httpRequestConfig.authValue}
                onChange={(e) => setHttpRequestConfig(prev => ({ ...prev, authValue: e.target.value }))}
                className="mt-1 border-neutral-700 bg-neutral-800"
              />
            </div>
          )}

          {/* Headers */}
          <div>
            <Label className="text-xs text-neutral-400">Headers (JSON)</Label>
            <Textarea
              placeholder='{"Content-Type": "application/json"}'
              value={httpRequestConfig.headers}
              onChange={(e) => setHttpRequestConfig(prev => ({ ...prev, headers: e.target.value }))}
              className="mt-1 min-h-[80px] font-mono text-xs border-neutral-700 bg-neutral-800"
            />
          </div>

          {/* Body (for POST, PUT, PATCH) */}
          {['POST', 'PUT', 'PATCH'].includes(httpRequestConfig.method) && (
            <div>
              <Label className="text-xs text-neutral-400">Request Body (JSON)</Label>
              <Textarea
                placeholder='{"key": "value", "data": "{{previousOutput}}"}'
                value={httpRequestConfig.body}
                onChange={(e) => setHttpRequestConfig(prev => ({ ...prev, body: e.target.value }))}
                className="mt-1 min-h-[100px] font-mono text-xs border-neutral-700 bg-neutral-800"
              />
            </div>
          )}

          {/* Advanced Settings */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-neutral-400">Timeout (seconds)</Label>
              <Input
                type="number"
                min={1}
                max={120}
                value={httpRequestConfig.timeout}
                onChange={(e) => setHttpRequestConfig(prev => ({ ...prev, timeout: parseInt(e.target.value) || 30 }))}
                className="mt-1 border-neutral-700 bg-neutral-800"
              />
            </div>
            <div>
              <Label className="text-xs text-neutral-400">Retries on Failure</Label>
              <Input
                type="number"
                min={0}
                max={5}
                value={httpRequestConfig.retries}
                onChange={(e) => setHttpRequestConfig(prev => ({ ...prev, retries: parseInt(e.target.value) || 0 }))}
                className="mt-1 border-neutral-700 bg-neutral-800"
              />
            </div>
          </div>

          <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-3">
            <p className="text-xs text-neutral-400">
              <span className="text-blue-400 font-medium">Variables:</span> Use {"{{previousOutput}}"}, {"{{triggerData}}"} in URL or body
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderScheduleTriggerConfig = () => (
    <div className="space-y-4">
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-500/20 p-2">
              <Clock className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <CardTitle className="text-base">Schedule Trigger</CardTitle>
              <CardDescription className="text-xs">
                Run your workflow on a schedule
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Schedule Type */}
          <div>
            <Label className="text-xs text-neutral-400">Schedule Type</Label>
            <Select
              value={scheduleConfig.type}
              onValueChange={(value) => setScheduleConfig(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger className="mt-1 border-neutral-700 bg-neutral-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interval">Interval (Every X minutes/hours)</SelectItem>
                <SelectItem value="daily">Daily at specific time</SelectItem>
                <SelectItem value="weekly">Weekly on specific days</SelectItem>
                <SelectItem value="cron">Custom Cron Expression</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Interval Settings */}
          {scheduleConfig.type === 'interval' && (
            <div className="flex gap-3">
              <div className="flex-1">
                <Label className="text-xs text-neutral-400">Every</Label>
                <Input
                  type="number"
                  min={1}
                  value={scheduleConfig.interval}
                  onChange={(e) => setScheduleConfig(prev => ({ ...prev, interval: parseInt(e.target.value) || 1 }))}
                  className="mt-1 border-neutral-700 bg-neutral-800"
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-neutral-400">Unit</Label>
                <Select
                  value={scheduleConfig.intervalUnit}
                  onValueChange={(value) => setScheduleConfig(prev => ({ ...prev, intervalUnit: value }))}
                >
                  <SelectTrigger className="mt-1 border-neutral-700 bg-neutral-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Daily Settings */}
          {scheduleConfig.type === 'daily' && (
            <div>
              <Label className="text-xs text-neutral-400">Time of Day</Label>
              <Input
                type="time"
                value={scheduleConfig.timeOfDay}
                onChange={(e) => setScheduleConfig(prev => ({ ...prev, timeOfDay: e.target.value }))}
                className="mt-1 border-neutral-700 bg-neutral-800"
              />
            </div>
          )}

          {/* Weekly Settings */}
          {scheduleConfig.type === 'weekly' && (
            <>
              <div>
                <Label className="text-xs text-neutral-400">Days of Week</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => (
                    <Button
                      key={day}
                      type="button"
                      size="sm"
                      variant={scheduleConfig.dayOfWeek.includes(day) ? 'default' : 'outline'}
                      className="w-12 h-8 text-xs"
                      onClick={() => {
                        setScheduleConfig(prev => ({
                          ...prev,
                          dayOfWeek: prev.dayOfWeek.includes(day)
                            ? prev.dayOfWeek.filter(d => d !== day)
                            : [...prev.dayOfWeek, day]
                        }))
                      }}
                    >
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs text-neutral-400">Time</Label>
                <Input
                  type="time"
                  value={scheduleConfig.timeOfDay}
                  onChange={(e) => setScheduleConfig(prev => ({ ...prev, timeOfDay: e.target.value }))}
                  className="mt-1 border-neutral-700 bg-neutral-800"
                />
              </div>
            </>
          )}

          {/* Cron Expression */}
          {scheduleConfig.type === 'cron' && (
            <div>
              <Label className="text-xs text-neutral-400">Cron Expression</Label>
              <Input
                placeholder="0 */5 * * *"
                value={scheduleConfig.cronExpression}
                onChange={(e) => setScheduleConfig(prev => ({ ...prev, cronExpression: e.target.value }))}
                className="mt-1 font-mono border-neutral-700 bg-neutral-800"
              />
              <div className="mt-2 text-[10px] text-neutral-500">
                <p>Format: minute hour day month weekday</p>
                <p className="mt-1">Examples:</p>
                <ul className="ml-3 space-y-0.5">
                  <li><code className="text-indigo-400">*/15 * * * *</code> - Every 15 minutes</li>
                  <li><code className="text-indigo-400">0 9 * * 1-5</code> - Weekdays at 9 AM</li>
                  <li><code className="text-indigo-400">0 0 1 * *</code> - Monthly on the 1st</li>
                </ul>
              </div>
            </div>
          )}

          {/* Timezone */}
          <div>
            <Label className="text-xs text-neutral-400">Timezone</Label>
            <Select
              value={scheduleConfig.timezone}
              onValueChange={(value) => setScheduleConfig(prev => ({ ...prev, timezone: value }))}
            >
              <SelectTrigger className="mt-1 border-neutral-700 bg-neutral-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                <SelectItem value="Europe/Paris">Paris (CET/CEST)</SelectItem>
                <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3">
            <p className="text-xs text-indigo-300">
              <span className="font-medium">Next Run:</span> Will run every {scheduleConfig.interval} {scheduleConfig.intervalUnit}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderTextFormatterConfig = () => (
    <div className="space-y-4">
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/20 p-2">
              <FileText className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">Text Formatter</CardTitle>
              <CardDescription className="text-xs">
                Transform and format text data
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Operation Type */}
          <div>
            <Label className="text-xs text-neutral-400">Operation</Label>
            <Select
              value={textFormatterConfig.operation}
              onValueChange={(value) => setTextFormatterConfig(prev => ({ ...prev, operation: value }))}
            >
              <SelectTrigger className="mt-1 border-neutral-700 bg-neutral-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="template">Template (Combine multiple inputs)</SelectItem>
                <SelectItem value="replace">Find & Replace</SelectItem>
                <SelectItem value="transform">Transform (Case, Trim, etc.)</SelectItem>
                <SelectItem value="extract">Extract (Regex Pattern)</SelectItem>
                <SelectItem value="split">Split into Array</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Template Operation */}
          {textFormatterConfig.operation === 'template' && (
            <div>
              <Label className="text-xs text-neutral-400">Template</Label>
              <Textarea
                placeholder="Hello {{userName}}, your order {{orderId}} is ready!"
                value={textFormatterConfig.template}
                onChange={(e) => setTextFormatterConfig(prev => ({ ...prev, template: e.target.value }))}
                className="mt-1 min-h-[100px] border-neutral-700 bg-neutral-800"
              />
              <div className="mt-2 flex flex-wrap gap-1">
                <Badge variant="outline" className="text-xs cursor-pointer hover:bg-neutral-800" onClick={() => setTextFormatterConfig(prev => ({ ...prev, template: prev.template + '{{previousOutput}}' }))}>{"{{previousOutput}}"}</Badge>
                <Badge variant="outline" className="text-xs cursor-pointer hover:bg-neutral-800" onClick={() => setTextFormatterConfig(prev => ({ ...prev, template: prev.template + '{{fileName}}' }))}>{"{{fileName}}"}</Badge>
                <Badge variant="outline" className="text-xs cursor-pointer hover:bg-neutral-800" onClick={() => setTextFormatterConfig(prev => ({ ...prev, template: prev.template + '{{timestamp}}' }))}>{"{{timestamp}}"}</Badge>
              </div>
            </div>
          )}

          {/* Find & Replace Operation */}
          {textFormatterConfig.operation === 'replace' && (
            <>
              <div>
                <Label className="text-xs text-neutral-400">Find (text or regex)</Label>
                <Input
                  placeholder="text to find"
                  value={textFormatterConfig.findText}
                  onChange={(e) => setTextFormatterConfig(prev => ({ ...prev, findText: e.target.value }))}
                  className="mt-1 border-neutral-700 bg-neutral-800"
                />
              </div>
              <div>
                <Label className="text-xs text-neutral-400">Replace With</Label>
                <Input
                  placeholder="replacement text"
                  value={textFormatterConfig.replaceText}
                  onChange={(e) => setTextFormatterConfig(prev => ({ ...prev, replaceText: e.target.value }))}
                  className="mt-1 border-neutral-700 bg-neutral-800"
                />
              </div>
            </>
          )}

          {/* Transform Operation */}
          {textFormatterConfig.operation === 'transform' && (
            <div>
              <Label className="text-xs text-neutral-400">Transform Type</Label>
              <Select
                value={textFormatterConfig.transformType}
                onValueChange={(value) => setTextFormatterConfig(prev => ({ ...prev, transformType: value }))}
              >
                <SelectTrigger className="mt-1 border-neutral-700 bg-neutral-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lowercase">To Lowercase</SelectItem>
                  <SelectItem value="uppercase">To UPPERCASE</SelectItem>
                  <SelectItem value="capitalize">Capitalize Words</SelectItem>
                  <SelectItem value="trim">Trim Whitespace</SelectItem>
                  <SelectItem value="slug">URL Slug (kebab-case)</SelectItem>
                  <SelectItem value="camelCase">camelCase</SelectItem>
                  <SelectItem value="base64_encode">Base64 Encode</SelectItem>
                  <SelectItem value="base64_decode">Base64 Decode</SelectItem>
                  <SelectItem value="url_encode">URL Encode</SelectItem>
                  <SelectItem value="html_escape">HTML Escape</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Extract Operation */}
          {textFormatterConfig.operation === 'extract' && (
            <div>
              <Label className="text-xs text-neutral-400">Regex Pattern</Label>
              <Input
                placeholder="([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\\.[a-zA-Z0-9_-]+)"
                value={textFormatterConfig.findText}
                onChange={(e) => setTextFormatterConfig(prev => ({ ...prev, findText: e.target.value }))}
                className="mt-1 font-mono text-xs border-neutral-700 bg-neutral-800"
              />
              <p className="mt-1 text-[10px] text-neutral-500">
                Use capturing groups () to extract specific parts
              </p>
            </div>
          )}

          {/* Split Operation */}
          {textFormatterConfig.operation === 'split' && (
            <div>
              <Label className="text-xs text-neutral-400">Split Delimiter</Label>
              <Input
                placeholder=", or \\n for newline"
                value={textFormatterConfig.findText}
                onChange={(e) => setTextFormatterConfig(prev => ({ ...prev, findText: e.target.value }))}
                className="mt-1 border-neutral-700 bg-neutral-800"
              />
            </div>
          )}

          <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-3">
            <p className="text-xs text-neutral-400">
              <span className="text-emerald-400 font-medium">Input:</span> Uses {"{{previousOutput}}"} or trigger data automatically
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderDataFilterConfig = () => (
    <div className="space-y-4">
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-rose-500/20 p-2">
              <GitBranch className="h-5 w-5 text-rose-400" />
            </div>
            <div>
              <CardTitle className="text-base">Data Filter</CardTitle>
              <CardDescription className="text-xs">
                Filter, sort, and transform data arrays
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter Type */}
          <div>
            <Label className="text-xs text-neutral-400">Operation</Label>
            <Select
              value={dataFilterConfig.filterType}
              onValueChange={(value) => setDataFilterConfig(prev => ({ ...prev, filterType: value }))}
            >
              <SelectTrigger className="mt-1 border-neutral-700 bg-neutral-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="property">Filter by Property</SelectItem>
                <SelectItem value="extract">Extract Property</SelectItem>
                <SelectItem value="sort">Sort Array</SelectItem>
                <SelectItem value="limit">Limit Results</SelectItem>
                <SelectItem value="unique">Remove Duplicates</SelectItem>
                <SelectItem value="flatten">Flatten Nested Array</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter by Property */}
          {dataFilterConfig.filterType === 'property' && (
            <>
              <div>
                <Label className="text-xs text-neutral-400">Property Path</Label>
                <Input
                  placeholder="data.items or [0].name"
                  value={dataFilterConfig.propertyPath}
                  onChange={(e) => setDataFilterConfig(prev => ({ ...prev, propertyPath: e.target.value }))}
                  className="mt-1 font-mono text-xs border-neutral-700 bg-neutral-800"
                />
              </div>
              <div>
                <Label className="text-xs text-neutral-400">Condition</Label>
                <Select
                  value={dataFilterConfig.operator}
                  onValueChange={(value) => setDataFilterConfig(prev => ({ ...prev, operator: value }))}
                >
                  <SelectTrigger className="mt-1 border-neutral-700 bg-neutral-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">Equals</SelectItem>
                    <SelectItem value="not_equals">Not Equals</SelectItem>
                    <SelectItem value="contains">Contains</SelectItem>
                    <SelectItem value="greater_than">Greater Than</SelectItem>
                    <SelectItem value="less_than">Less Than</SelectItem>
                    <SelectItem value="exists">Exists (not null)</SelectItem>
                    <SelectItem value="regex">Matches Regex</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-neutral-400">Value</Label>
                <Input
                  placeholder="value to compare"
                  value={dataFilterConfig.value}
                  onChange={(e) => setDataFilterConfig(prev => ({ ...prev, value: e.target.value }))}
                  className="mt-1 border-neutral-700 bg-neutral-800"
                />
              </div>
            </>
          )}

          {/* Extract Property */}
          {dataFilterConfig.filterType === 'extract' && (
            <div>
              <Label className="text-xs text-neutral-400">Property Path to Extract</Label>
              <Input
                placeholder="response.data.items"
                value={dataFilterConfig.propertyPath}
                onChange={(e) => setDataFilterConfig(prev => ({ ...prev, propertyPath: e.target.value }))}
                className="mt-1 font-mono text-xs border-neutral-700 bg-neutral-800"
              />
              <p className="mt-1 text-[10px] text-neutral-500">
                Use dot notation: data.users[0].name
              </p>
            </div>
          )}

          {/* Sort Array */}
          {dataFilterConfig.filterType === 'sort' && (
            <>
              <div>
                <Label className="text-xs text-neutral-400">Sort By Property</Label>
                <Input
                  placeholder="createdAt or price"
                  value={dataFilterConfig.sortBy}
                  onChange={(e) => setDataFilterConfig(prev => ({ ...prev, sortBy: e.target.value }))}
                  className="mt-1 border-neutral-700 bg-neutral-800"
                />
              </div>
              <div>
                <Label className="text-xs text-neutral-400">Order</Label>
                <Select
                  value={dataFilterConfig.sortOrder}
                  onValueChange={(value) => setDataFilterConfig(prev => ({ ...prev, sortOrder: value }))}
                >
                  <SelectTrigger className="mt-1 border-neutral-700 bg-neutral-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending (A-Z, 0-9)</SelectItem>
                    <SelectItem value="desc">Descending (Z-A, 9-0)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Limit Results */}
          {dataFilterConfig.filterType === 'limit' && (
            <div>
              <Label className="text-xs text-neutral-400">Maximum Items</Label>
              <Input
                type="number"
                min={1}
                value={dataFilterConfig.limit}
                onChange={(e) => setDataFilterConfig(prev => ({ ...prev, limit: parseInt(e.target.value) || 10 }))}
                className="mt-1 border-neutral-700 bg-neutral-800"
              />
            </div>
          )}

          <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-3">
            <p className="text-xs text-neutral-400">
              <span className="text-rose-400 font-medium">Tip:</span> Chain multiple Data Filter nodes for complex transformations
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderCodeConfig = () => (
    <div className="space-y-4">
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-yellow-500/20 p-2">
              <Copy className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <CardTitle className="text-base">Custom Code</CardTitle>
              <CardDescription className="text-xs">
                Run custom JavaScript for advanced logic
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Code Editor */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs text-neutral-400">JavaScript Code</Label>
              <Badge variant="outline" className="text-[10px]">ES2020+</Badge>
            </div>
            <Textarea
              placeholder={`// Your code here
const result = input.data;
return result;`}
              value={codeConfig.code}
              onChange={(e) => setCodeConfig(prev => ({ ...prev, code: e.target.value }))}
              className="mt-1 min-h-[200px] font-mono text-xs border-neutral-700 bg-neutral-800"
            />
          </div>

          {/* Timeout */}
          <div>
            <Label className="text-xs text-neutral-400">Execution Timeout (seconds)</Label>
            <Input
              type="number"
              min={1}
              max={60}
              value={codeConfig.timeout}
              onChange={(e) => setCodeConfig(prev => ({ ...prev, timeout: parseInt(e.target.value) || 10 }))}
              className="mt-1 border-neutral-700 bg-neutral-800"
            />
          </div>

          {/* Reference */}
          <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-3">
            <p className="text-xs font-medium text-neutral-300 mb-2">Available Variables:</p>
            <div className="space-y-1 text-xs text-neutral-400 font-mono">
              <p><span className="text-yellow-400">input</span> - Data from previous node</p>
              <p><span className="text-yellow-400">input.data</span> - Main data payload</p>
              <p><span className="text-yellow-400">input.trigger</span> - Trigger info</p>
              <p><span className="text-yellow-400">input.timestamp</span> - Execution time</p>
            </div>
          </div>

          {/* Examples */}
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
            <p className="text-xs font-medium text-yellow-400 mb-2">Example Snippets:</p>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start text-xs h-8"
                onClick={() => setCodeConfig(prev => ({ 
                  ...prev, 
                  code: `// Filter array items
const filtered = input.data.filter(item => item.active);
return { items: filtered, count: filtered.length };` 
                }))}
              >
                Filter array items
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start text-xs h-8"
                onClick={() => setCodeConfig(prev => ({ 
                  ...prev, 
                  code: `// Transform data structure
const transformed = input.data.map(item => ({
  id: item.id,
  fullName: \`\${item.firstName} \${item.lastName}\`,
  email: item.email.toLowerCase()
}));
return transformed;` 
                }))}
              >
                Transform data structure
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start text-xs h-8"
                onClick={() => setCodeConfig(prev => ({ 
                  ...prev, 
                  code: `// Aggregate/summarize data
const total = input.data.reduce((sum, item) => sum + item.amount, 0);
const average = total / input.data.length;
return { total, average, count: input.data.length };` 
                }))}
              >
                Aggregate data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderGenericActionConfig = () => (
    <div className="space-y-4">
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-neutral-700 p-2">
              <Zap className="h-5 w-5 text-neutral-300" />
            </div>
            <div>
              <CardTitle className="text-base">Action Node</CardTitle>
              <CardDescription className="text-xs">
                Generic action in your workflow
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-neutral-700 bg-neutral-900 p-4 text-center">
            <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-400" />
            <p className="text-sm font-medium text-neutral-300">Ready to Use</p>
            <p className="mt-1 text-xs text-neutral-500">
              This action node is ready to be connected in your workflow.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  // Render the appropriate config based on node type
  const renderNodeConfig = () => {
    switch (serviceType) {
      case 'Wait':
        return renderWaitNodeConfig()
      case 'Condition':
        return renderConditionNodeConfig()
      case 'AI':
        return renderAINodeConfig()
      case 'Email':
        return renderEmailNodeConfig()
      case 'Trigger':
        return renderTriggerNodeConfig()
      case 'Custom Webhook':
        return renderCustomWebhookConfig()
      case 'Google Calendar':
        return renderGoogleCalendarConfig()
      case 'Gmail Read':
        return renderGmailReadConfig()
      case 'Gmail Send':
        return renderGmailSendConfig()
      case 'HTTP Request':
        return renderHTTPRequestConfig()
      case 'Schedule Trigger':
        return renderScheduleTriggerConfig()
      case 'Text Formatter':
        return renderTextFormatterConfig()
      case 'Data Filter':
        return renderDataFilterConfig()
      case 'Code':
        return renderCodeConfig()
      case 'Action':
        return renderGenericActionConfig()
      default:
        return renderGenericActionConfig()
    }
  }

  const renderActionTab = () => (
    <div className="space-y-4">
      {!connected ? (
        <Card className="border-neutral-800 bg-neutral-900/50">
          <CardContent className="py-8 text-center">
            <XCircle className="mx-auto mb-3 h-10 w-10 text-neutral-600" />
            <p className="text-sm text-neutral-400">
              Connect {serviceType} first to configure actions
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Discord Message Configuration */}
          {serviceType === 'Discord' && (
            <Card className="border-neutral-800 bg-neutral-900/50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-indigo-500/20 p-2">
                    <Zap className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Discord Message</CardTitle>
                    <CardDescription className="text-xs">
                      Configure the message to send to Discord
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-neutral-400">Message Content</Label>
                  <Textarea
                    placeholder="Enter your message. Use variables like {{previousOutput}} to include data from previous nodes..."
                    value={discordConfig.message}
                    onChange={(e) => { setDiscordConfig(prev => ({ ...prev, message: e.target.value })); setIsConfigSaved(false) }}
                    className="mt-1 min-h-[100px] border-neutral-700 bg-neutral-800"
                  />
                </div>

                {/* Variables Reference */}
                <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-3">
                  <p className="text-xs font-medium text-neutral-300 mb-2">
                    Available Variables {sourceNodeType && <span className="text-neutral-500">(from {sourceNodeType})</span>}:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {availableVariables.map((variable) => (
                      <Badge 
                        key={variable.name}
                        variant="outline" 
                        className="text-xs cursor-pointer hover:bg-neutral-800" 
                        title={variable.description}
                        onClick={() => { setDiscordConfig(prev => ({ ...prev, message: prev.message + variable.name })); setIsConfigSaved(false) }}
                      >
                        {variable.name}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-2">Click a variable to add it to your message. Hover for description.</p>
                </div>

                {/* Preview */}
                {showPreview && discordConfig.message && (
                  <div className="rounded-lg border border-indigo-500/30 bg-indigo-900/10 p-3">
                    <p className="text-xs font-medium text-indigo-300 mb-2">📤 Message Preview (with sample data)</p>
                    <pre className="text-xs text-neutral-300 whitespace-pre-wrap font-mono max-h-24 overflow-y-auto">
                      {discordConfig.message
                        .replace(/\{\{previousOutput\}\}/g, '[AI Summary or previous node output will appear here]')
                        .replace(/\{\{fileName\}\}/g, 'example-document.pdf')
                        .replace(/\{\{fileContent\}\}/g, '[File content]')
                        .replace(/\{\{timestamp\}\}/g, new Date().toISOString())
                        .replace(/\{\{triggerData\}\}/g, '{ "event": "file_changed" }')}
                    </pre>
                  </div>
                )}

                {/* Save and Preview Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    {isConfigSaved ? (
                      <Badge className="bg-green-500/20 text-green-400">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Saved
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/20 text-amber-400">
                        <XCircle className="mr-1 h-3 w-3" />
                        Unsaved
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreview(!showPreview)}
                      className="gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      {showPreview ? 'Hide' : 'Preview'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={saveNodeConfig}
                      disabled={isSavingConfig || isConfigSaved}
                      className="gap-1"
                    >
                      {isSavingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save
                    </Button>
                  </div>
                </div>

                {/* Tip */}
                <div className="rounded-lg border border-dashed border-indigo-500/30 bg-indigo-900/10 p-3">
                  <p className="text-[10px] text-neutral-400">
                    <span className="text-indigo-400 font-medium">💡 Tip:</span> Use <code className="text-indigo-300">{"{{previousOutput}}"}</code> to automatically include the AI summary or output from the previous node.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Slack Message Configuration */}
          {serviceType === 'Slack' && (
            <Card className="border-neutral-800 bg-neutral-900/50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-purple-500/20 p-2">
                    <Zap className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Slack Message</CardTitle>
                    <CardDescription className="text-xs">
                      Configure the message to send to Slack
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-neutral-400">Message Content</Label>
                  <Textarea
                    placeholder="Enter your message. Use variables like {{previousOutput}} to include data from previous nodes..."
                    value={slackConfig.message}
                    onChange={(e) => { setSlackConfig(prev => ({ ...prev, message: e.target.value })); setIsConfigSaved(false) }}
                    className="mt-1 min-h-[100px] border-neutral-700 bg-neutral-800"
                  />
                </div>

                {/* Variables Reference */}
                <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-3">
                  <p className="text-xs font-medium text-neutral-300 mb-2">
                    Available Variables {sourceNodeType && <span className="text-neutral-500">(from {sourceNodeType})</span>}:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {availableVariables.map((variable) => (
                      <Badge 
                        key={variable.name}
                        variant="outline" 
                        className="text-xs cursor-pointer hover:bg-neutral-800" 
                        title={variable.description}
                        onClick={() => { setSlackConfig(prev => ({ ...prev, message: prev.message + variable.name })); setIsConfigSaved(false) }}
                      >
                        {variable.name}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-2">Click a variable to add it to your message. Hover for description.</p>
                </div>

                {/* Preview */}
                {showPreview && slackConfig.message && (
                  <div className="rounded-lg border border-purple-500/30 bg-purple-900/10 p-3">
                    <p className="text-xs font-medium text-purple-300 mb-2">📤 Message Preview (with sample data)</p>
                    <pre className="text-xs text-neutral-300 whitespace-pre-wrap font-mono max-h-24 overflow-y-auto">
                      {slackConfig.message
                        .replace(/\{\{previousOutput\}\}/g, '[AI Summary or previous node output will appear here]')
                        .replace(/\{\{fileName\}\}/g, 'example-document.pdf')
                        .replace(/\{\{fileContent\}\}/g, '[File content]')
                        .replace(/\{\{timestamp\}\}/g, new Date().toISOString())
                        .replace(/\{\{triggerData\}\}/g, '{ "event": "file_changed" }')}
                    </pre>
                  </div>
                )}

                {/* Save and Preview Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    {isConfigSaved ? (
                      <Badge className="bg-green-500/20 text-green-400">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Saved
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/20 text-amber-400">
                        <XCircle className="mr-1 h-3 w-3" />
                        Unsaved
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreview(!showPreview)}
                      className="gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      {showPreview ? 'Hide' : 'Preview'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={saveNodeConfig}
                      disabled={isSavingConfig || isConfigSaved}
                      className="gap-1"
                    >
                      {isSavingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notion Content Configuration */}
          {serviceType === 'Notion' && (
            <Card className="border-neutral-800 bg-neutral-900/50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-neutral-500/20 p-2">
                    <FileText className="h-5 w-5 text-neutral-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Notion Content</CardTitle>
                    <CardDescription className="text-xs">
                      Configure the content to save to Notion
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-neutral-400">Content to Store</Label>
                  <Textarea
                    placeholder="Enter content to store in Notion. Use variables like {{previousOutput}} to include data from previous nodes..."
                    value={notionConfig.content}
                    onChange={(e) => { setNotionConfig(prev => ({ ...prev, content: e.target.value })); setIsConfigSaved(false) }}
                    className="mt-1 min-h-[100px] border-neutral-700 bg-neutral-800"
                  />
                </div>

                {/* Variables Reference */}
                <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-3">
                  <p className="text-xs font-medium text-neutral-300 mb-2">
                    Available Variables {sourceNodeType && <span className="text-neutral-500">(from {sourceNodeType})</span>}:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {availableVariables.map((variable) => (
                      <Badge 
                        key={variable.name}
                        variant="outline" 
                        className="text-xs cursor-pointer hover:bg-neutral-800" 
                        title={variable.description}
                        onClick={() => { setNotionConfig(prev => ({ ...prev, content: prev.content + variable.name })); setIsConfigSaved(false) }}
                      >
                        {variable.name}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-2">Click a variable to add it to your content. Hover for description.</p>
                </div>

                {/* Preview */}
                {showPreview && notionConfig.content && (
                  <div className="rounded-lg border border-neutral-500/30 bg-neutral-800/50 p-3">
                    <p className="text-xs font-medium text-neutral-300 mb-2">📝 Content Preview (with sample data)</p>
                    <pre className="text-xs text-neutral-300 whitespace-pre-wrap font-mono max-h-24 overflow-y-auto">
                      {notionConfig.content
                        .replace(/\{\{previousOutput\}\}/g, '[AI Summary or previous node output will appear here]')
                        .replace(/\{\{fileName\}\}/g, 'example-document.pdf')
                        .replace(/\{\{fileContent\}\}/g, '[File content]')
                        .replace(/\{\{timestamp\}\}/g, new Date().toISOString())}
                    </pre>
                  </div>
                )}

                {/* Save and Preview Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    {isConfigSaved ? (
                      <Badge className="bg-green-500/20 text-green-400">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Saved
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/20 text-amber-400">
                        <XCircle className="mr-1 h-3 w-3" />
                        Unsaved
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreview(!showPreview)}
                      className="gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      {showPreview ? 'Hide' : 'Preview'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={saveNodeConfig}
                      disabled={isSavingConfig || isConfigSaved}
                      className="gap-1"
                    >
                      {isSavingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Slack Channel Selection */}
          {serviceType === 'Slack' && slackChannels?.length > 0 && (
            <Card className="border-neutral-800 bg-neutral-900/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Select Channels</CardTitle>
                <CardDescription className="text-xs">
                  Choose channels to send the message to
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MultipleSelector
                  value={selectedSlackChannels}
                  onChange={setSelectedSlackChannels}
                  defaultOptions={slackChannels}
                  placeholder="Select channels..."
                  emptyIndicator={
                    <p className="text-center text-sm text-neutral-500">
                      No channels found
                    </p>
                  }
                />
              </CardContent>
            </Card>
          )}

          {/* Google Drive File Selection */}
          {serviceType === 'Google Drive' && (
            <Card className="border-neutral-800 bg-neutral-900/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Google Drive Files</CardTitle>
                    <CardDescription className="text-xs">
                      Select a file to trigger the workflow
                    </CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={fetchGoogleDriveFile}
                    disabled={isLoadingFile}
                  >
                    {isLoadingFile ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <GoogleDriveFiles />
              </CardContent>
            </Card>
          )}

          {/* File Details (for non-Google Drive nodes) */}
          {JSON.stringify(googleFile) !== '{}' && serviceType !== 'Google Drive' && serviceType !== 'Trigger' && (
            <Card className="border-neutral-800 bg-neutral-900/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Attached File</CardTitle>
                <CardDescription className="text-xs">
                  File from Google Drive trigger
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GoogleFileDetails
                  nodeConnection={nodeConnection}
                  title={serviceType}
                  gFile={googleFile}
                />
              </CardContent>
            </Card>
          )}

          {/* Action Button */}
          {serviceType !== 'Trigger' && serviceType !== 'Google Drive' && (
            <Card className="border-neutral-800 bg-neutral-900/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Test Action</CardTitle>
                <CardDescription className="text-xs">
                  Test this node with current configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ActionButton
                  currentService={serviceType}
                  nodeConnection={nodeConnection}
                  channels={selectedSlackChannels}
                  setChannels={setSelectedSlackChannels}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )

  const renderSettingsTab = () => (
    <div className="space-y-4">
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Node Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Node ID</span>
            <code className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">
              {node.id.slice(0, 8)}...
            </code>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Type</span>
            <span className="text-neutral-300">{node.type}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Position</span>
            <span className="text-neutral-300">
              x: {Math.round(node.position.x)}, y: {Math.round(node.position.y)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-400">
            {node.data.description || 'No description available'}
          </p>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg border-neutral-800 bg-neutral-950 p-0">
        <DialogHeader className="border-b border-neutral-800 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-neutral-800 p-2">
              <EditorCanvasIconHelper type={node.type} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg">{displayTitle}</DialogTitle>
                {!requiresOAuth && (
                  <Badge variant="outline" className="text-xs border-green-500/30 text-green-400">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Ready
                  </Badge>
                )}
              </div>
              <DialogDescription className="text-xs">
                {requiresOAuth 
                  ? 'Configure connection and action settings'
                  : 'Configure this node\'s settings'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b border-neutral-800 bg-transparent px-4">
            {/* Show different tabs based on whether OAuth is required */}
            {requiresOAuth ? (
              <>
                <TabsTrigger 
                  value="connection" 
                  className="gap-2 data-[state=active]:bg-neutral-800"
                >
                  <Link2 className="h-4 w-4" />
                  Connection
                </TabsTrigger>
                <TabsTrigger 
                  value="action" 
                  className="gap-2 data-[state=active]:bg-neutral-800"
                >
                  <Zap className="h-4 w-4" />
                  Action
                </TabsTrigger>
              </>
            ) : (
              <TabsTrigger 
                value="config" 
                className="gap-2 data-[state=active]:bg-neutral-800"
              >
                <Settings2 className="h-4 w-4" />
                Configuration
              </TabsTrigger>
            )}
            <TabsTrigger 
              value="settings" 
              className="gap-2 data-[state=active]:bg-neutral-800"
            >
              <FileText className="h-4 w-4" />
              Info
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px]">
            <div className="p-4">
              {requiresOAuth ? (
                <>
                  <TabsContent value="connection" className="mt-0">
                    {renderConnectionTab()}
                  </TabsContent>
                  <TabsContent value="action" className="mt-0">
                    {renderActionTab()}
                  </TabsContent>
                </>
              ) : (
                <TabsContent value="config" className="mt-0">
                  {renderNodeConfig()}
                </TabsContent>
              )}
              <TabsContent value="settings" className="mt-0">
                {renderSettingsTab()}
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
