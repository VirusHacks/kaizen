'use client'
import { Button } from '@/components/ui/button'
import { useNodeConnections } from '@/providers/connections-provider'
import { usePathname } from 'next/navigation'
import React, { useCallback, useEffect, useState, useRef } from 'react'
import {
  onCreateNodesEdges,
  onFlowPublish,
} from '../_actions/workflow-connections'
import { toast } from 'sonner'
import { Loader2, Save, Upload, Play, CheckCircle2, XCircle, ChevronDown, ChevronUp, CloudOff, Cloud } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Props = {
  children: React.ReactNode
  edges: any[]
  nodes: any[]
}

interface ExecutionLog {
  timestamp: string
  nodeId: string
  nodeType: string
  status: 'started' | 'completed' | 'error' | 'skipped'
  message: string
  input?: any
  output?: any
  error?: string
}

// Test data configurations for different trigger/first node types
type TriggerType = 'Google Drive' | 'Gmail Read' | 'Google Calendar' | 'Schedule Trigger' | 'Custom Webhook' | 'HTTP Request' | 'Trigger' | 'default'

interface TestDataConfig {
  type: TriggerType
  label: string
  description: string
  fields: {
    key: string
    label: string
    type: 'text' | 'textarea' | 'select' | 'number' | 'datetime'
    placeholder?: string
    options?: { value: string; label: string }[]
    defaultValue: string | number
  }[]
  buildTestData: (values: Record<string, any>) => Record<string, any>
}

const TEST_DATA_CONFIGS: Record<string, TestDataConfig> = {
  'Google Drive': {
    type: 'Google Drive',
    label: 'Google Drive Trigger',
    description: 'Simulates a file change event from Google Drive',
    fields: [
      { key: 'fileName', label: 'File Name', type: 'text', placeholder: 'document.pdf', defaultValue: 'Sample Document.pdf' },
      { key: 'fileType', label: 'File Type', type: 'select', options: [
        { value: 'application/pdf', label: 'PDF' },
        { value: 'application/vnd.google-apps.document', label: 'Google Doc' },
        { value: 'application/vnd.google-apps.spreadsheet', label: 'Google Sheet' },
        { value: 'text/plain', label: 'Text File' },
        { value: 'image/png', label: 'PNG Image' },
        { value: 'image/jpeg', label: 'JPEG Image' },
      ], defaultValue: 'application/pdf' },
      { key: 'content', label: 'File Content (for text files)', type: 'textarea', placeholder: 'File content...', defaultValue: 'This is sample content from a test file. The AI will process this data and generate a summary.' },
      { key: 'fileSize', label: 'File Size (bytes)', type: 'number', defaultValue: 1024 },
    ],
    buildTestData: (values) => ({
      type: 'drive_change',
      name: values.fileName,
      fileName: values.fileName,
      mimeType: values.fileType,
      content: values.content,
      fileSize: values.fileSize,
      fileId: `test-file-${Date.now()}`,
      fileUrl: `https://drive.google.com/file/d/test-file-${Date.now()}/view`,
      timestamp: new Date().toISOString(),
    })
  },
  'Gmail Read': {
    type: 'Gmail Read',
    label: 'Gmail Read Trigger',
    description: 'Simulates incoming emails from Gmail',
    fields: [
      { key: 'from', label: 'From Email', type: 'text', placeholder: 'sender@example.com', defaultValue: 'john.doe@example.com' },
      { key: 'to', label: 'To Email', type: 'text', placeholder: 'recipient@example.com', defaultValue: 'me@company.com' },
      { key: 'subject', label: 'Email Subject', type: 'text', placeholder: 'Subject line', defaultValue: 'Project Update: Q4 Review Meeting' },
      { key: 'body', label: 'Email Body', type: 'textarea', placeholder: 'Email content...', defaultValue: 'Hi Team,\n\nPlease find the attached Q4 review document. We will discuss the key points in our meeting tomorrow at 3 PM.\n\nBest regards,\nJohn' },
      { key: 'snippet', label: 'Email Snippet', type: 'text', placeholder: 'Preview text', defaultValue: 'Hi Team, Please find the attached Q4 review document...' },
      { key: 'hasAttachment', label: 'Has Attachment', type: 'select', options: [
        { value: 'true', label: 'Yes' },
        { value: 'false', label: 'No' },
      ], defaultValue: 'true' },
    ],
    buildTestData: (values) => ({
      type: 'email_received',
      emails: [{
        id: `test-email-${Date.now()}`,
        threadId: `test-thread-${Date.now()}`,
        from: values.from,
        to: values.to,
        subject: values.subject,
        body: values.body,
        snippet: values.snippet,
        date: new Date().toISOString(),
        hasAttachment: values.hasAttachment === 'true',
        labels: ['INBOX', 'UNREAD'],
      }],
      emailCount: 1,
      email: {
        id: `test-email-${Date.now()}`,
        from: values.from,
        to: values.to,
        subject: values.subject,
        body: values.body,
        snippet: values.snippet,
        date: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    })
  },
  'Google Calendar': {
    type: 'Google Calendar',
    label: 'Google Calendar Trigger',
    description: 'Simulates a calendar event',
    fields: [
      { key: 'eventTitle', label: 'Event Title', type: 'text', placeholder: 'Meeting title', defaultValue: 'Team Standup Meeting' },
      { key: 'eventDescription', label: 'Event Description', type: 'textarea', placeholder: 'Event details...', defaultValue: 'Daily standup to discuss progress and blockers' },
      { key: 'startTime', label: 'Start Time', type: 'datetime', defaultValue: new Date(Date.now() + 3600000).toISOString().slice(0, 16) },
      { key: 'endTime', label: 'End Time', type: 'datetime', defaultValue: new Date(Date.now() + 7200000).toISOString().slice(0, 16) },
      { key: 'attendees', label: 'Attendees (comma-separated)', type: 'text', placeholder: 'email1@example.com, email2@example.com', defaultValue: 'alice@company.com, bob@company.com' },
      { key: 'location', label: 'Location', type: 'text', placeholder: 'Meeting room or link', defaultValue: 'Conference Room A' },
    ],
    buildTestData: (values) => ({
      type: 'calendar_event',
      event: {
        id: `test-event-${Date.now()}`,
        title: values.eventTitle,
        summary: values.eventTitle,
        description: values.eventDescription,
        start: { dateTime: values.startTime },
        end: { dateTime: values.endTime },
        attendees: values.attendees.split(',').map((e: string) => ({ email: e.trim() })),
        location: values.location,
        status: 'confirmed',
      },
      eventTitle: values.eventTitle,
      eventDescription: values.eventDescription,
      startTime: values.startTime,
      endTime: values.endTime,
      attendees: values.attendees,
      location: values.location,
      timestamp: new Date().toISOString(),
    })
  },
  'Schedule Trigger': {
    type: 'Schedule Trigger',
    label: 'Schedule Trigger',
    description: 'Simulates a scheduled/cron trigger',
    fields: [
      { key: 'scheduleName', label: 'Schedule Name', type: 'text', placeholder: 'Daily Report', defaultValue: 'Daily Report Generation' },
      { key: 'scheduleType', label: 'Schedule Type', type: 'select', options: [
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'monthly', label: 'Monthly' },
        { value: 'hourly', label: 'Hourly' },
        { value: 'custom', label: 'Custom Cron' },
      ], defaultValue: 'daily' },
      { key: 'lastRun', label: 'Last Run Time', type: 'datetime', defaultValue: new Date(Date.now() - 86400000).toISOString().slice(0, 16) },
    ],
    buildTestData: (values) => ({
      type: 'schedule_trigger',
      scheduleName: values.scheduleName,
      scheduleType: values.scheduleType,
      lastRun: values.lastRun,
      currentRun: new Date().toISOString(),
      runNumber: Math.floor(Math.random() * 1000) + 1,
      timestamp: new Date().toISOString(),
    })
  },
  'Custom Webhook': {
    type: 'Custom Webhook',
    label: 'Custom Webhook Trigger',
    description: 'Simulates an incoming webhook request',
    fields: [
      { key: 'webhookPayload', label: 'Webhook Payload (JSON)', type: 'textarea', placeholder: '{"key": "value"}', defaultValue: '{\n  "action": "created",\n  "resource": "user",\n  "data": {\n    "id": "123",\n    "name": "John Doe",\n    "email": "john@example.com"\n  }\n}' },
      { key: 'webhookSource', label: 'Webhook Source', type: 'text', placeholder: 'Source system', defaultValue: 'External CRM' },
      { key: 'webhookMethod', label: 'HTTP Method', type: 'select', options: [
        { value: 'POST', label: 'POST' },
        { value: 'PUT', label: 'PUT' },
        { value: 'PATCH', label: 'PATCH' },
      ], defaultValue: 'POST' },
    ],
    buildTestData: (values) => {
      let parsedPayload = {}
      try {
        parsedPayload = JSON.parse(values.webhookPayload)
      } catch {
        parsedPayload = { raw: values.webhookPayload }
      }
      return {
        type: 'webhook',
        source: values.webhookSource,
        method: values.webhookMethod,
        payload: parsedPayload,
        headers: {
          'content-type': 'application/json',
          'x-webhook-source': values.webhookSource,
        },
        ...parsedPayload,
        timestamp: new Date().toISOString(),
      }
    }
  },
  'HTTP Request': {
    type: 'HTTP Request',
    label: 'HTTP Request Trigger',
    description: 'Simulates an HTTP request/response',
    fields: [
      { key: 'responseBody', label: 'Response Body (JSON)', type: 'textarea', placeholder: '{"data": "value"}', defaultValue: '{\n  "status": "success",\n  "data": {\n    "users": [\n      {"id": 1, "name": "Alice"},\n      {"id": 2, "name": "Bob"}\n    ],\n    "total": 2\n  }\n}' },
      { key: 'statusCode', label: 'Status Code', type: 'number', defaultValue: 200 },
      { key: 'responseHeaders', label: 'Response Headers', type: 'text', placeholder: 'content-type: application/json', defaultValue: 'content-type: application/json' },
    ],
    buildTestData: (values) => {
      let parsedBody = {}
      try {
        parsedBody = JSON.parse(values.responseBody)
      } catch {
        parsedBody = { raw: values.responseBody }
      }
      return {
        type: 'http_response',
        response: parsedBody,
        status: values.statusCode,
        statusCode: values.statusCode,
        headers: { 'content-type': 'application/json' },
        body: parsedBody,
        ...parsedBody,
        timestamp: new Date().toISOString(),
      }
    }
  },
  'Trigger': {
    type: 'Trigger',
    label: 'Generic Trigger',
    description: 'Simulates a generic workflow trigger',
    fields: [
      { key: 'triggerName', label: 'Trigger Name', type: 'text', placeholder: 'Manual trigger', defaultValue: 'Manual Workflow Trigger' },
      { key: 'triggerData', label: 'Trigger Data (JSON)', type: 'textarea', placeholder: '{"key": "value"}', defaultValue: '{\n  "message": "Workflow triggered manually",\n  "user": "test-user",\n  "source": "manual"\n}' },
    ],
    buildTestData: (values) => {
      let parsedData = {}
      try {
        parsedData = JSON.parse(values.triggerData)
      } catch {
        parsedData = { raw: values.triggerData }
      }
      return {
        type: 'trigger',
        name: values.triggerName,
        ...parsedData,
        timestamp: new Date().toISOString(),
      }
    }
  },
  'default': {
    type: 'default',
    label: 'Default Test Data',
    description: 'Generic test data for any workflow',
    fields: [
      { key: 'fileName', label: 'File Name', type: 'text', placeholder: 'document.pdf', defaultValue: 'Sample Document.pdf' },
      { key: 'content', label: 'Content', type: 'textarea', placeholder: 'Test content...', defaultValue: 'This is sample content from a test file. The AI will process this data and generate a summary.' },
    ],
    buildTestData: (values) => ({
      type: 'test',
      name: values.fileName,
      fileName: values.fileName,
      mimeType: 'application/pdf',
      content: values.content,
      timestamp: new Date().toISOString(),
    })
  }
}

// Helper to get the first node (trigger) type
function getFirstNodeType(nodes: any[], edges: any[]): string {
  // Find nodes that have no incoming edges (source nodes)
  const targetIds = new Set(edges.map((e: any) => e.target))
  const sourceNodes = nodes.filter((n: any) => !targetIds.has(n.id))
  
  if (sourceNodes.length > 0) {
    return sourceNodes[0].type || 'default'
  }
  
  // Fallback to first node in list
  if (nodes.length > 0) {
    return nodes[0].type || 'default'
  }
  
  return 'default'
}

const FlowInstance = ({ children, edges, nodes }: Props) => {
  const pathname = usePathname()
  const [isFlow, setIsFlow] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testModalOpen, setTestModalOpen] = useState(false)
  const [testResults, setTestResults] = useState<{
    success: boolean
    logs: ExecutionLog[]
    finalOutput: any
    error?: string
  } | null>(null)
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set())
  
  // Dynamic test data based on first node type
  const [testDataValues, setTestDataValues] = useState<Record<string, any>>({})
  
  // Get the trigger type and its config
  const triggerType = getFirstNodeType(nodes, edges)
  const testConfig = TEST_DATA_CONFIGS[triggerType] || TEST_DATA_CONFIGS['default']
  
  // Initialize test data when trigger type changes
  useEffect(() => {
    const initialValues: Record<string, any> = {}
    testConfig.fields.forEach(field => {
      initialValues[field.key] = field.defaultValue
    })
    setTestDataValues(initialValues)
  }, [triggerType])
  const { nodeConnection } = useNodeConnections()

  // Auto-save tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const previousNodesRef = useRef<string>('')
  const previousEdgesRef = useRef<string>('')
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInitialMount = useRef(true)

  // Calculate flow path from edges and nodes
  const calculateFlowPath = useCallback(() => {
    const flows: string[] = []
    const connectedEdges = edges.map((edge) => edge.target)
    connectedEdges.forEach((target) => {
      nodes.forEach((node) => {
        if (node.id === target) {
          flows.push(node.type)
        }
      })
    })
    return flows
  }, [edges, nodes])

  // Update isFlow when edges or nodes change
  useEffect(() => {
    const flows = calculateFlowPath()
    setIsFlow(flows)
  }, [calculateFlowPath])

  const onFlowAutomation = useCallback(async (silent: boolean = false) => {
    if (nodes.length === 0) {
      if (!silent) toast.error('No nodes to save')
      return false
    }

    setIsSaving(true)
    setAutoSaveStatus('saving')
    try {
      const workflowId = pathname.split('/').pop()
      if (!workflowId) {
        if (!silent) toast.error('Workflow ID not found')
        return false
      }

      const flowPath = calculateFlowPath()
      
      console.log('Saving workflow:', {
        workflowId,
        nodesCount: nodes.length,
        edgesCount: edges.length,
        flowPath
      })

      const flow = await onCreateNodesEdges(
        workflowId,
        JSON.stringify(nodes),
        JSON.stringify(edges),
        JSON.stringify(flowPath)
      )

      if (flow) {
        if (!silent) toast.success(flow.message)
        setHasUnsavedChanges(false)
        setAutoSaveStatus('saved')
        // Update refs to current state
        previousNodesRef.current = JSON.stringify(nodes)
        previousEdgesRef.current = JSON.stringify(edges)
        return true
      } else {
        if (!silent) toast.error('Failed to save workflow')
        setAutoSaveStatus('unsaved')
        return false
      }
    } catch (error) {
      console.error('Save error:', error)
      if (!silent) toast.error('Error saving workflow')
      setAutoSaveStatus('unsaved')
      return false
    } finally {
      setIsSaving(false)
    }
  }, [pathname, nodes, edges, calculateFlowPath])

  // Auto-save effect - detects changes and saves after debounce
  useEffect(() => {
    // Skip initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false
      previousNodesRef.current = JSON.stringify(nodes)
      previousEdgesRef.current = JSON.stringify(edges)
      return
    }

    const currentNodesStr = JSON.stringify(nodes)
    const currentEdgesStr = JSON.stringify(edges)

    // Check if there are actual changes
    const hasChanges = 
      currentNodesStr !== previousNodesRef.current || 
      currentEdgesStr !== previousEdgesRef.current

    if (!hasChanges) return

    // Mark as having unsaved changes
    setHasUnsavedChanges(true)
    setAutoSaveStatus('unsaved')

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    // Set new auto-save timer (1.5 second debounce)
    autoSaveTimerRef.current = setTimeout(() => {
      console.log('Auto-saving workflow...')
      onFlowAutomation(true) // Silent save
    }, 1500)

    // Cleanup
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [nodes, edges, onFlowAutomation])

  const onPublishWorkflow = useCallback(async () => {
    // First save, then publish
    if (nodes.length === 0) {
      toast.error('No nodes to publish')
      return
    }

    setIsPublishing(true)
    try {
      const workflowId = pathname.split('/').pop()
      if (!workflowId) {
        toast.error('Workflow ID not found')
        return
      }

      // First save the workflow
      const flowPath = calculateFlowPath()
      await onCreateNodesEdges(
        workflowId,
        JSON.stringify(nodes),
        JSON.stringify(edges),
        JSON.stringify(flowPath)
      )

      // Then publish
      const response = await onFlowPublish(workflowId, true)
      if (response) {
        toast.success(response)
      }
    } catch (error) {
      console.error('Publish error:', error)
      toast.error('Error publishing workflow')
    } finally {
      setIsPublishing(false)
    }
  }, [pathname, nodes, edges, calculateFlowPath])

  const onTestWorkflow = useCallback(async () => {
    if (nodes.length === 0) {
      toast.error('No nodes to test')
      return
    }

    // First save the workflow
    const workflowId = pathname.split('/').pop()
    if (!workflowId) {
      toast.error('Workflow ID not found')
      return
    }

    setIsTesting(true)
    setTestResults(null)
    setTestModalOpen(true)

    try {
      // Save first
      const flowPath = calculateFlowPath()
      await onCreateNodesEdges(
        workflowId,
        JSON.stringify(nodes),
        JSON.stringify(edges),
        JSON.stringify(flowPath)
      )

      // Build test data using the dynamic config
      const builtTestData = testConfig.buildTestData(testDataValues)

      // Then test
      const response = await fetch('/api/workflow/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId,
          testData: builtTestData
        })
      })

      const result = await response.json()
      setTestResults(result)

      if (result.success) {
        toast.success('Workflow test completed!')
      } else {
        toast.error(result.error || 'Workflow test failed')
      }
    } catch (error) {
      console.error('Test error:', error)
      toast.error('Error testing workflow')
      setTestResults({
        success: false,
        logs: [],
        finalOutput: null,
        error: 'Failed to execute workflow test'
      })
    } finally {
      setIsTesting(false)
    }
  }, [pathname, nodes, edges, calculateFlowPath, testConfig, testDataValues])

  const toggleLogExpand = (index: number) => {
    const newExpanded = new Set(expandedLogs)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedLogs(newExpanded)
  }

  // Check if we have at least one connection (edge)
  const canSave = nodes.length > 0
  const canPublish = nodes.length > 0 && edges.length > 0
  const canTest = nodes.length > 0

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3 p-4 items-center">
        {/* Auto-save status indicator */}
        <div className="flex items-center gap-1.5 text-xs mr-2">
          {autoSaveStatus === 'saving' && (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
              <span className="text-blue-400">Saving...</span>
            </>
          )}
          {autoSaveStatus === 'saved' && (
            <>
              <Cloud className="h-3 w-3 text-green-500" />
              <span className="text-green-500">Saved</span>
            </>
          )}
          {autoSaveStatus === 'unsaved' && !isSaving && (
            <>
              <CloudOff className="h-3 w-3 text-amber-400" />
              <span className="text-amber-400">Unsaved</span>
            </>
          )}
        </div>

        <Button
          onClick={() => onFlowAutomation(false)}
          disabled={!canSave || isSaving}
          className="gap-2"
          variant={hasUnsavedChanges ? "default" : "outline"}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save
            </>
          )}
        </Button>
        
        <Button
          onClick={onTestWorkflow}
          disabled={!canTest || isTesting}
          variant="outline"
          className="gap-2 border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
        >
          {isTesting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Test
            </>
          )}
        </Button>

        <Button
          disabled={!canPublish || isPublishing}
          onClick={onPublishWorkflow}
          className="gap-2 bg-green-600 hover:bg-green-700"
        >
          {isPublishing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Publishing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Publish
            </>
          )}
        </Button>
      </div>

      {/* Test Results Modal */}
      <Dialog open={testModalOpen} onOpenChange={setTestModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {testResults?.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : testResults?.error ? (
                <XCircle className="h-5 w-5 text-red-500" />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin" />
              )}
              Workflow Test Results
            </DialogTitle>
            <DialogDescription>
              {isTesting ? 'Running workflow test...' : 
               testResults?.success ? 'Workflow executed successfully!' : 
               testResults?.error || 'Test completed with errors'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Test Data Input - Dynamic based on trigger type */}
            {!testResults && (
              <Card className="border-neutral-800">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {testConfig.label}
                    </Badge>
                    Test Input Data
                  </CardTitle>
                  <p className="text-xs text-neutral-400 mt-1">{testConfig.description}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {testConfig.fields.map((field) => (
                    <div key={field.key}>
                      <Label className="text-xs">{field.label}</Label>
                      
                      {field.type === 'text' && (
                        <Input 
                          value={testDataValues[field.key] || ''}
                          onChange={(e) => setTestDataValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                          placeholder={field.placeholder}
                          className="mt-1 bg-neutral-800 border-neutral-700"
                        />
                      )}
                      
                      {field.type === 'number' && (
                        <Input 
                          type="number"
                          value={testDataValues[field.key] || ''}
                          onChange={(e) => setTestDataValues(prev => ({ ...prev, [field.key]: Number(e.target.value) }))}
                          placeholder={field.placeholder}
                          className="mt-1 bg-neutral-800 border-neutral-700"
                        />
                      )}
                      
                      {field.type === 'datetime' && (
                        <Input 
                          type="datetime-local"
                          value={testDataValues[field.key] || ''}
                          onChange={(e) => setTestDataValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                          className="mt-1 bg-neutral-800 border-neutral-700"
                        />
                      )}
                      
                      {field.type === 'textarea' && (
                        <Textarea 
                          value={testDataValues[field.key] || ''}
                          onChange={(e) => setTestDataValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                          placeholder={field.placeholder}
                          className="mt-1 bg-neutral-800 border-neutral-700 min-h-[80px] font-mono text-xs"
                        />
                      )}
                      
                      {field.type === 'select' && field.options && (
                        <Select
                          value={testDataValues[field.key] || ''}
                          onValueChange={(value) => setTestDataValues(prev => ({ ...prev, [field.key]: value }))}
                        >
                          <SelectTrigger className="mt-1 bg-neutral-800 border-neutral-700">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  ))}
                  
                  {/* Preview of test data that will be sent */}
                  <div className="mt-4 pt-4 border-t border-neutral-800">
                    <details className="text-xs">
                      <summary className="cursor-pointer text-neutral-400 hover:text-neutral-300">
                        Preview Test Data (JSON)
                      </summary>
                      <pre className="mt-2 p-2 bg-neutral-900 rounded overflow-x-auto text-green-400">
                        {JSON.stringify(testConfig.buildTestData(testDataValues), null, 2)}
                      </pre>
                    </details>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Execution Logs */}
            {testResults && (
              <ScrollArea className="flex-1">
                <div className="space-y-2 pr-4">
                  {testResults.logs.map((log, index) => (
                    <Card 
                      key={index} 
                      className={`border-neutral-800 ${
                        log.status === 'error' ? 'border-red-500/50' : 
                        log.status === 'completed' ? 'border-green-500/30' : ''
                      }`}
                    >
                      <CardContent className="p-3">
                        <div 
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => toggleLogExpand(index)}
                        >
                          <div className="flex items-center gap-2">
                            {log.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                            {log.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                            {log.status === 'started' && <Loader2 className="h-4 w-4 text-blue-400" />}
                            
                            <Badge variant="outline" className="text-xs">
                              {log.nodeType === 'system' ? '🔧 System' : log.nodeType}
                            </Badge>
                            
                            <span className="text-sm text-neutral-300">{log.message}</span>
                          </div>
                          
                          {(log.input || log.output) && (
                            expandedLogs.has(index) ? 
                              <ChevronUp className="h-4 w-4 text-neutral-500" /> : 
                              <ChevronDown className="h-4 w-4 text-neutral-500" />
                          )}
                        </div>
                        
                        {expandedLogs.has(index) && (log.input || log.output) && (
                          <div className="mt-3 space-y-2">
                            {log.input && (
                              <div>
                                <p className="text-xs text-neutral-500 mb-1">Input:</p>
                                <pre className="text-xs bg-neutral-900 p-2 rounded overflow-x-auto max-h-32 overflow-y-auto">
                                  {typeof log.input === 'string' ? log.input : JSON.stringify(log.input, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.output && (
                              <div>
                                <p className="text-xs text-neutral-500 mb-1">Output:</p>
                                <pre className="text-xs bg-neutral-900 p-2 rounded overflow-x-auto max-h-32 overflow-y-auto text-green-400">
                                  {typeof log.output === 'string' ? log.output : JSON.stringify(log.output, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.error && (
                              <div>
                                <p className="text-xs text-neutral-500 mb-1">Error:</p>
                                <pre className="text-xs bg-red-900/30 p-2 rounded text-red-400">
                                  {log.error}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Final Output */}
            {testResults?.finalOutput && (
              <Card className="border-green-500/50 bg-green-500/5">
                <CardHeader className="py-2">
                  <CardTitle className="text-sm text-green-400">Final Output</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs overflow-x-auto max-h-40 overflow-y-auto">
                    {typeof testResults.finalOutput === 'string' 
                      ? testResults.finalOutput 
                      : JSON.stringify(testResults.finalOutput, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t border-neutral-800">
            {!isTesting && testResults && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setTestResults(null)
                  setExpandedLogs(new Set())
                }}
              >
                Run Again
              </Button>
            )}
            <Button onClick={() => setTestModalOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Debug info in dev */}
      {process.env.NODE_ENV === 'development' && (
        <div className="px-4 text-xs text-neutral-500">
          Nodes: {nodes.length} | Edges: {edges.length} | Flow: {isFlow.join(' → ') || 'None'}
        </div>
      )}
      {children}
    </div>
  )
}

export default FlowInstance
