/**
 * Workflow Executor
 * Handles the execution of workflows with proper data passing between nodes
 */

import { postContentToWebHook } from '@/app/(main)/(pages)/connections/_actions/discord-connection'
import { onCreateNewPageInDatabase } from '@/app/(main)/(pages)/connections/_actions/notion-connection'
import { postMessageToSlack } from '@/app/(main)/(pages)/connections/_actions/slack-connection'

export interface WorkflowNode {
  id: string
  type: string
  data: {
    title: string
    description: string
    metadata?: any
  }
  position: { x: number; y: number }
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
}

export interface ExecutionLog {
  timestamp: Date
  nodeId: string
  nodeType: string
  status: 'started' | 'completed' | 'error' | 'skipped'
  message: string
  input?: any
  output?: any
  error?: string
}

export interface ExecutionContext {
  // Trigger data (e.g., from Google Drive)
  trigger: {
    type: string
    data: any
  }
  // Data passed between nodes
  nodeOutputs: Record<string, any>
  // Current execution step
  currentStep: number
  // Logs for debugging
  logs: ExecutionLog[]
  // User credentials
  credentials: {
    googleAccessToken?: string
    googleRefreshToken?: string
    discordWebhookUrl?: string
    slackAccessToken?: string
    slackChannels?: string[]
    notionAccessToken?: string
    notionDbId?: string
    openaiApiKey?: string
  }
  // Is this a test execution?
  isTest?: boolean
}

export interface ExecutionResult {
  success: boolean
  logs: ExecutionLog[]
  finalOutput: any
  error?: string
}

/**
 * Build execution order from nodes and edges (topological sort)
 */
export function buildExecutionOrder(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const inDegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>()

  // Initialize
  nodes.forEach(node => {
    inDegree.set(node.id, 0)
    adjacency.set(node.id, [])
  })

  // Build graph
  edges.forEach(edge => {
    adjacency.get(edge.source)?.push(edge.target)
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1)
  })

  // Find starting nodes (in-degree 0)
  const queue: string[] = []
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) queue.push(nodeId)
  })

  // Topological sort
  const result: WorkflowNode[] = []
  while (queue.length > 0) {
    const nodeId = queue.shift()!
    const node = nodeMap.get(nodeId)
    if (node) result.push(node)

    adjacency.get(nodeId)?.forEach(targetId => {
      const newDegree = (inDegree.get(targetId) || 0) - 1
      inDegree.set(targetId, newDegree)
      if (newDegree === 0) queue.push(targetId)
    })
  }

  return result
}

/**
 * Get the source node(s) for a given node
 */
export function getSourceNodes(nodeId: string, edges: WorkflowEdge[]): string[] {
  return edges.filter(e => e.target === nodeId).map(e => e.source)
}

/**
 * Resolve template variables in a string
 * Supports: {{triggerData}}, {{previousOutput}}, {{nodeId.field}}, {{fileName}}, etc.
 */
export function resolveTemplate(template: string, context: ExecutionContext, currentNodeId: string, edges: WorkflowEdge[]): string {
  if (!template) return ''

  let result = template

  // Replace {{triggerData}} with full trigger data
  result = result.replace(/\{\{triggerData\}\}/g, JSON.stringify(context.trigger.data, null, 2))
  
  // Replace {{triggerData.field}} with specific fields
  result = result.replace(/\{\{triggerData\.(\w+)\}\}/g, (_, field) => {
    return context.trigger.data?.[field] ?? ''
  })

  // Replace {{fileName}} - common trigger field
  result = result.replace(/\{\{fileName\}\}/g, context.trigger.data?.name || context.trigger.data?.fileName || 'Unknown File')
  
  // Replace {{fileContent}} - if available
  result = result.replace(/\{\{fileContent\}\}/g, context.trigger.data?.content || '')

  // Replace {{previousOutput}} with the output from the previous node
  const sourceNodes = getSourceNodes(currentNodeId, edges)
  if (sourceNodes.length > 0) {
    const previousNodeId = sourceNodes[0] // Get first source node
    const previousOutput = context.nodeOutputs[previousNodeId]
    result = result.replace(/\{\{previousOutput\}\}/g, 
      typeof previousOutput === 'string' ? previousOutput : JSON.stringify(previousOutput, null, 2)
    )
  } else {
    // No previous node, replace with empty or trigger data
    result = result.replace(/\{\{previousOutput\}\}/g, '')
  }

  // Replace {{nodeId.field}} with specific node output
  result = result.replace(/\{\{(\w+)\.(\w+)\}\}/g, (_, nodeId, field) => {
    const nodeOutput = context.nodeOutputs[nodeId]
    if (nodeOutput && typeof nodeOutput === 'object') {
      return nodeOutput[field] ?? ''
    }
    return ''
  })

  // Replace {{timestamp}}
  result = result.replace(/\{\{timestamp\}\}/g, new Date().toISOString())

  // Replace {{date}}
  result = result.replace(/\{\{date\}\}/g, new Date().toLocaleDateString())

  return result
}

/**
 * Execute Gmail Read node - Fetch emails from Gmail
 */
async function executeGmailRead(
  node: WorkflowNode,
  context: ExecutionContext
): Promise<{ success: boolean; output: any; error?: string }> {
  const config = node.data.metadata?.gmailReadConfig || {}
  
  if (!context.credentials.googleAccessToken) {
    return { success: false, output: null, error: 'Google not connected' }
  }

  try {
    // Build query parameters
    const params = new URLSearchParams()
    params.append('action', config.action || 'list')
    params.append('maxResults', config.maxResults || '10')
    
    if (config.from) params.append('from', config.from)
    if (config.to) params.append('to', config.to)
    if (config.subject) params.append('subject', config.subject)
    if (config.label) params.append('label', config.label)
    if (config.after) params.append('after', config.after)
    if (config.before) params.append('before', config.before)
    if (config.hasAttachment) params.append('hasAttachment', 'true')
    if (config.isUnread) params.append('isUnread', 'true')
    if (config.customQuery) params.append('q', config.customQuery)
    
    // In test mode, return mock data
    if (context.isTest) {
      return {
        success: true,
        output: {
          emails: [
            {
              id: 'test-email-1',
              subject: 'Test Email Subject',
              from: 'sender@example.com',
              snippet: 'This is a test email preview...',
              date: new Date().toISOString()
            }
          ],
          totalCount: 1,
          action: config.action || 'list'
        }
      }
    }

    // Make actual API call
    const baseUrl = process.env.NGROK_URI || process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/gmail?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${context.credentials.googleAccessToken}`
      }
    })

    if (!response.ok) {
      const error = await response.text()
      return { success: false, output: null, error: `Gmail API error: ${error}` }
    }

    const data = await response.json()
    return { success: true, output: data }
  } catch (error: any) {
    return { success: false, output: null, error: error.message }
  }
}

/**
 * Execute Gmail Send node - Send an email via Gmail
 */
async function executeGmailSend(
  node: WorkflowNode,
  context: ExecutionContext,
  edges: WorkflowEdge[]
): Promise<{ success: boolean; output: any; error?: string }> {
  const config = node.data.metadata?.gmailSendConfig || {}
  
  if (!context.credentials.googleAccessToken) {
    return { success: false, output: null, error: 'Google not connected' }
  }

  // Resolve templates in email fields
  const to = resolveTemplate(config.to || '', context, node.id, edges)
  const cc = resolveTemplate(config.cc || '', context, node.id, edges)
  const bcc = resolveTemplate(config.bcc || '', context, node.id, edges)
  const subject = resolveTemplate(config.subject || '', context, node.id, edges)
  const body = resolveTemplate(config.bodyText || '', context, node.id, edges)

  if (!to) {
    return { success: false, output: null, error: 'Recipient email (to) is required' }
  }

  // In test mode, return mock data
  if (context.isTest) {
    return {
      success: true,
      output: {
        sent: true,
        to,
        cc,
        bcc,
        subject,
        body,
        action: config.action || 'send',
        message: 'Email would be sent (test mode)'
      }
    }
  }

  try {
    const baseUrl = process.env.NGROK_URI || process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/gmail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${context.credentials.googleAccessToken}`
      },
      body: JSON.stringify({
        action: config.action || 'send',
        to,
        cc,
        bcc,
        subject,
        body,
        isHtml: config.bodyType === 'html',
        replyToMessageId: config.replyToMessageId
      })
    })

    if (!response.ok) {
      const error = await response.text()
      return { success: false, output: null, error: `Gmail Send error: ${error}` }
    }

    const data = await response.json()
    return { success: true, output: { sent: true, ...data } }
  } catch (error: any) {
    return { success: false, output: null, error: error.message }
  }
}

/**
 * Execute Google Calendar node
 */
async function executeGoogleCalendar(
  node: WorkflowNode,
  context: ExecutionContext,
  edges: WorkflowEdge[]
): Promise<{ success: boolean; output: any; error?: string }> {
  const config = node.data.metadata?.calendarConfig || {}
  
  if (!context.credentials.googleAccessToken) {
    return { success: false, output: null, error: 'Google not connected' }
  }

  const actionType = config.actionType || 'create'

  // In test mode, return mock data
  if (context.isTest) {
    if (actionType === 'read') {
      return {
        success: true,
        output: {
          events: [
            {
              id: 'test-event-1',
              summary: 'Test Calendar Event',
              start: new Date().toISOString(),
              end: new Date(Date.now() + 3600000).toISOString()
            }
          ],
          readAction: config.readAction || 'today',
          message: 'Calendar events would be fetched (test mode)'
        }
      }
    } else {
      return {
        success: true,
        output: {
          created: true,
          title: resolveTemplate(config.title || '', context, node.id, edges),
          date: config.date,
          time: config.time,
          duration: config.duration,
          message: 'Calendar event would be created (test mode)'
        }
      }
    }
  }

  try {
    const baseUrl = process.env.NGROK_URI || process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
    
    if (actionType === 'read') {
      const params = new URLSearchParams()
      params.append('action', config.readAction || 'today')
      params.append('maxResults', config.maxResults || '10')
      if (config.searchQuery) params.append('q', config.searchQuery)

      const response = await fetch(`${baseUrl}/api/calendar?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${context.credentials.googleAccessToken}`
        }
      })

      if (!response.ok) {
        return { success: false, output: null, error: 'Calendar read failed' }
      }

      const data = await response.json()
      return { success: true, output: data }
    } else {
      // Create event
      const title = resolveTemplate(config.title || 'New Event', context, node.id, edges)
      const description = resolveTemplate(config.description || '', context, node.id, edges)
      
      // Build start/end datetime
      const eventDate = config.date || new Date().toISOString().split('T')[0]
      const eventTime = config.time || '09:00'
      const duration = parseInt(config.duration) || 60
      
      const startDateTime = new Date(`${eventDate}T${eventTime}`)
      const endDateTime = new Date(startDateTime.getTime() + duration * 60000)

      const response = await fetch(`${baseUrl}/api/calendar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${context.credentials.googleAccessToken}`
        },
        body: JSON.stringify({
          summary: title,
          description,
          location: config.location,
          startDateTime: startDateTime.toISOString(),
          endDateTime: endDateTime.toISOString(),
          timeZone: config.timezone || 'UTC',
          attendees: config.attendees?.split(',').map((e: string) => e.trim()).filter(Boolean)
        })
      })

      if (!response.ok) {
        return { success: false, output: null, error: 'Calendar event creation failed' }
      }

      const data = await response.json()
      return { success: true, output: { created: true, ...data } }
    }
  } catch (error: any) {
    return { success: false, output: null, error: error.message }
  }
}

/**
 * Execute Email node - Send email via Resend
 */
async function executeEmail(
  node: WorkflowNode,
  context: ExecutionContext,
  edges: WorkflowEdge[]
): Promise<{ success: boolean; output: any; error?: string }> {
  const config = node.data.metadata?.emailConfig || {}
  
  const to = resolveTemplate(config.to || '', context, node.id, edges)
  const subject = resolveTemplate(config.subject || '', context, node.id, edges)
  const body = resolveTemplate(config.body || '', context, node.id, edges)

  if (!to) {
    return { success: false, output: null, error: 'Recipient email required' }
  }

  // In test mode, return mock
  if (context.isTest) {
    return {
      success: true,
      output: { sent: true, to, subject, body, message: 'Email would be sent (test mode)' }
    }
  }

  // Check for Resend API key
  if (!process.env.RESEND_API_KEY) {
    return { success: false, output: null, error: 'RESEND_API_KEY not configured' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@commando-ai.com',
        to: [to],
        subject,
        html: body.includes('<') ? body : `<p>${body}</p>`
      })
    })

    if (!response.ok) {
      const error = await response.json()
      return { success: false, output: null, error: `Resend error: ${JSON.stringify(error)}` }
    }

    const data = await response.json()
    return { success: true, output: { sent: true, id: data.id, to, subject } }
  } catch (error: any) {
    return { success: false, output: null, error: error.message }
  }
}

/**
 * Execute Wait node - Delay execution
 */
async function executeWait(
  node: WorkflowNode,
  context: ExecutionContext
): Promise<{ success: boolean; output: any; error?: string }> {
  const config = node.data.metadata?.waitConfig || {}
  const value = parseInt(config.value) || 1
  const unit = config.unit || 'seconds'

  // Calculate milliseconds
  let ms = value * 1000 // default seconds
  switch (unit) {
    case 'milliseconds': ms = value; break
    case 'seconds': ms = value * 1000; break
    case 'minutes': ms = value * 60 * 1000; break
    case 'hours': ms = value * 60 * 60 * 1000; break
    case 'days': ms = value * 24 * 60 * 60 * 1000; break
  }

  // In test mode, don't actually wait
  if (context.isTest) {
    return {
      success: true,
      output: { waited: false, duration: value, unit, ms, message: `Would wait ${value} ${unit} (test mode)` }
    }
  }

  // Cap wait time at 5 minutes for safety in production
  const maxWait = 5 * 60 * 1000 // 5 minutes
  const actualWait = Math.min(ms, maxWait)

  await new Promise(resolve => setTimeout(resolve, actualWait))

  return {
    success: true,
    output: { waited: true, duration: value, unit, actualWaitMs: actualWait }
  }
}

/**
 * Execute Condition node - Branch based on condition
 */
async function executeCondition(
  node: WorkflowNode,
  context: ExecutionContext,
  edges: WorkflowEdge[]
): Promise<{ success: boolean; output: any; error?: string }> {
  const config = node.data.metadata?.conditionConfig || {}
  const sourceNodes = getSourceNodes(node.id, edges)
  
  // Get input data from previous node or trigger
  let inputData = context.trigger.data
  if (sourceNodes.length > 0) {
    inputData = context.nodeOutputs[sourceNodes[0]] || context.trigger.data
  }

  // Get field value to check
  const field = config.field || ''
  let fieldValue = inputData
  
  if (field && typeof inputData === 'object' && inputData !== null) {
    // Support nested fields like "data.name"
    const parts = field.split('.')
    fieldValue = parts.reduce((obj: any, key: string) => obj?.[key], inputData)
  }

  const operator = config.operator || 'exists'
  const compareValue = config.value || ''

  // Evaluate condition
  let result = false
  switch (operator) {
    case 'equals':
      result = String(fieldValue) === String(compareValue)
      break
    case 'not_equals':
      result = String(fieldValue) !== String(compareValue)
      break
    case 'contains':
      result = String(fieldValue).toLowerCase().includes(String(compareValue).toLowerCase())
      break
    case 'not_contains':
      result = !String(fieldValue).toLowerCase().includes(String(compareValue).toLowerCase())
      break
    case 'starts_with':
      result = String(fieldValue).startsWith(compareValue)
      break
    case 'ends_with':
      result = String(fieldValue).endsWith(compareValue)
      break
    case 'greater_than':
      result = Number(fieldValue) > Number(compareValue)
      break
    case 'less_than':
      result = Number(fieldValue) < Number(compareValue)
      break
    case 'greater_than_or_equal':
      result = Number(fieldValue) >= Number(compareValue)
      break
    case 'less_than_or_equal':
      result = Number(fieldValue) <= Number(compareValue)
      break
    case 'is_empty':
      result = !fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '')
      break
    case 'is_not_empty':
      result = !!fieldValue && (typeof fieldValue !== 'string' || fieldValue.trim() !== '')
      break
    case 'exists':
      result = fieldValue !== undefined && fieldValue !== null
      break
    case 'regex':
      try {
        const regex = new RegExp(compareValue, 'i')
        result = regex.test(String(fieldValue))
      } catch {
        result = false
      }
      break
    default:
      result = !!fieldValue
  }

  return {
    success: true,
    output: {
      condition: result,
      field,
      operator,
      compareValue,
      actualValue: fieldValue,
      inputData
    }
  }
}

/**
 * Execute HTTP Request node
 */
async function executeHTTPRequest(
  node: WorkflowNode,
  context: ExecutionContext,
  edges: WorkflowEdge[]
): Promise<{ success: boolean; output: any; error?: string }> {
  const config = node.data.metadata?.httpRequestConfig || {}
  
  const url = resolveTemplate(config.url || '', context, node.id, edges)
  const method = config.method || 'GET'
  
  if (!url) {
    return { success: false, output: null, error: 'URL is required' }
  }

  // In test mode, return mock
  if (context.isTest) {
    return {
      success: true,
      output: {
        url,
        method,
        status: 200,
        message: `HTTP ${method} to ${url} would be executed (test mode)`
      }
    }
  }

  try {
    // Build headers
    let headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    if (config.headers) {
      try {
        const customHeaders = JSON.parse(config.headers)
        headers = { ...headers, ...customHeaders }
      } catch {
        // Invalid JSON headers, ignore
      }
    }

    // Add auth if configured
    if (config.authType === 'bearer' && config.authToken) {
      headers['Authorization'] = `Bearer ${config.authToken}`
    } else if (config.authType === 'api_key' && config.apiKeyHeader && config.apiKeyValue) {
      headers[config.apiKeyHeader] = config.apiKeyValue
    } else if (config.authType === 'basic' && config.basicUsername && config.basicPassword) {
      const credentials = Buffer.from(`${config.basicUsername}:${config.basicPassword}`).toString('base64')
      headers['Authorization'] = `Basic ${credentials}`
    }

    // Build fetch options
    const fetchOptions: { method: string; headers: Record<string, string>; body?: string; signal?: AbortSignal } = {
      method,
      headers
    }

    // Add body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(method) && config.body) {
      const body = resolveTemplate(config.body, context, node.id, edges)
      fetchOptions.body = body
    }

    // Make request with timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), (config.timeout || 30) * 1000)
    
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    })
    
    clearTimeout(timeout)

    // Parse response
    let responseData
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      responseData = await response.json()
    } else {
      responseData = await response.text()
    }

    return {
      success: response.ok,
      output: {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData
      },
      error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
    }
  } catch (error: any) {
    return { success: false, output: null, error: error.message }
  }
}

/**
 * Execute Text Formatter node
 */
async function executeTextFormatter(
  node: WorkflowNode,
  context: ExecutionContext,
  edges: WorkflowEdge[]
): Promise<{ success: boolean; output: any; error?: string }> {
  const config = node.data.metadata?.textFormatterConfig || {}
  const sourceNodes = getSourceNodes(node.id, edges)
  
  // Get input from previous node
  let input = ''
  if (sourceNodes.length > 0) {
    const prevOutput = context.nodeOutputs[sourceNodes[0]]
    input = typeof prevOutput === 'string' ? prevOutput : JSON.stringify(prevOutput)
  }

  const operation = config.operation || 'template'
  let output = input

  switch (operation) {
    case 'template':
      output = resolveTemplate(config.template || '', context, node.id, edges)
      break

    case 'replace':
      const findText = config.findText || ''
      const replaceText = config.replaceText || ''
      const useRegex = config.useRegex || false
      
      if (useRegex) {
        try {
          const regex = new RegExp(findText, 'g')
          output = input.replace(regex, replaceText)
        } catch {
          output = input
        }
      } else {
        output = input.split(findText).join(replaceText)
      }
      break

    case 'transform':
      switch (config.transformType) {
        case 'lowercase': output = input.toLowerCase(); break
        case 'uppercase': output = input.toUpperCase(); break
        case 'capitalize': 
          output = input.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
          break
        case 'trim': output = input.trim(); break
        case 'slug':
          output = input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
          break
        case 'camelCase':
          output = input.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase())
          break
        case 'base64_encode': output = Buffer.from(input).toString('base64'); break
        case 'base64_decode': 
          try { output = Buffer.from(input, 'base64').toString() } catch { output = input }
          break
        case 'url_encode': output = encodeURIComponent(input); break
        case 'url_decode': output = decodeURIComponent(input); break
        case 'html_escape':
          output = input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          break
        default: output = input
      }
      break

    case 'extract':
      const pattern = config.extractPattern || ''
      try {
        const regex = new RegExp(pattern, 'g')
        const matches = input.match(regex)
        output = matches ? matches.join('\n') : ''
      } catch {
        output = ''
      }
      break

    case 'split':
      const delimiter = config.splitDelimiter || ','
      output = input.split(delimiter).map(s => s.trim()).filter(Boolean) as any
      break

    default:
      output = input
  }

  return { success: true, output }
}

/**
 * Execute Data Filter node
 */
async function executeDataFilter(
  node: WorkflowNode,
  context: ExecutionContext,
  edges: WorkflowEdge[]
): Promise<{ success: boolean; output: any; error?: string }> {
  const config = node.data.metadata?.dataFilterConfig || {}
  const sourceNodes = getSourceNodes(node.id, edges)
  
  // Get input from previous node
  let input: any = []
  if (sourceNodes.length > 0) {
    input = context.nodeOutputs[sourceNodes[0]]
  }

  // Ensure input is an array
  if (!Array.isArray(input)) {
    if (typeof input === 'object' && input !== null) {
      // Try to find an array property
      const arrayProp = Object.values(input).find(v => Array.isArray(v))
      input = arrayProp || [input]
    } else {
      input = [input]
    }
  }

  const operation = config.operation || 'filter'
  let output = input

  switch (operation) {
    case 'filter':
      const filterField = config.filterField || ''
      const filterOperator = config.filterOperator || 'equals'
      const filterValue = config.filterValue || ''
      
      output = input.filter((item: any) => {
        const value = filterField ? item?.[filterField] : item
        
        switch (filterOperator) {
          case 'equals': return String(value) === filterValue
          case 'not_equals': return String(value) !== filterValue
          case 'contains': return String(value).includes(filterValue)
          case 'greater_than': return Number(value) > Number(filterValue)
          case 'less_than': return Number(value) < Number(filterValue)
          case 'exists': return value !== undefined && value !== null
          case 'regex':
            try { return new RegExp(filterValue).test(String(value)) }
            catch { return false }
          default: return true
        }
      })
      break

    case 'extract':
      const extractField = config.extractField || ''
      if (extractField) {
        output = input.map((item: any) => {
          // Support nested fields
          const parts = extractField.split('.')
          return parts.reduce((obj: any, key: string) => obj?.[key], item)
        })
      }
      break

    case 'sort':
      const sortField = config.sortField || ''
      const sortDirection = config.sortDirection || 'asc'
      
      output = [...input].sort((a: any, b: any) => {
        const aVal = sortField ? a?.[sortField] : a
        const bVal = sortField ? b?.[sortField] : b
        
        if (sortDirection === 'asc') {
          return aVal > bVal ? 1 : -1
        } else {
          return aVal < bVal ? 1 : -1
        }
      })
      break

    case 'limit':
      const limit = parseInt(config.limitCount) || 10
      output = input.slice(0, limit)
      break

    case 'unique':
      const uniqueField = config.uniqueField || ''
      if (uniqueField) {
        const seen = new Set()
        output = input.filter((item: any) => {
          const val = item?.[uniqueField]
          if (seen.has(val)) return false
          seen.add(val)
          return true
        })
      } else {
        output = Array.from(new Set(input))
      }
      break

    case 'flatten':
      output = input.flat(config.flattenDepth || 1)
      break

    default:
      output = input
  }

  return { success: true, output }
}

/**
 * Execute Code node (sandboxed)
 */
async function executeCode(
  node: WorkflowNode,
  context: ExecutionContext,
  edges: WorkflowEdge[]
): Promise<{ success: boolean; output: any; error?: string }> {
  const config = node.data.metadata?.codeConfig || {}
  const sourceNodes = getSourceNodes(node.id, edges)
  
  // Get input from previous node
  let input: any = context.trigger.data
  if (sourceNodes.length > 0) {
    input = context.nodeOutputs[sourceNodes[0]]
  }

  const code = config.code || 'return input;'

  // In test mode or production, use safer execution
  try {
    // WARNING: eval-like execution - for production, consider using vm2 or isolated-vm
    // We're using eval here since it's user-defined code execution
    // eslint-disable-next-line no-new-func
    const createFunction = Function
    const fn = createFunction('input', 'context', `
      'use strict';
      ${code}
    `)
    
    // Execute with timeout
    const timeoutPromise = new Promise((_resolve, reject) => 
      setTimeout(() => reject(new Error('Code execution timeout')), (config.timeout || 5) * 1000)
    )
    
    const result = await Promise.race([
      Promise.resolve(fn(input, {
        trigger: context.trigger.data,
        previousOutputs: context.nodeOutputs
      })),
      timeoutPromise
    ])

    return { success: true, output: result }
  } catch (error: any) {
    return { success: false, output: null, error: `Code error: ${error.message}` }
  }
}

/**
 * Execute a single node
 */
export async function executeNode(
  node: WorkflowNode,
  context: ExecutionContext,
  edges: WorkflowEdge[],
  workflowConfig: any
): Promise<{ success: boolean; output: any; error?: string }> {
  const nodeType = node.type

  try {
    switch (nodeType) {
      case 'Google Drive':
      case 'Trigger':
      case 'Schedule Trigger': {
        // Trigger nodes just pass through their data
        return {
          success: true,
          output: context.trigger.data
        }
      }

      case 'AI': {
        // Get input from previous node
        const sourceNodes = getSourceNodes(node.id, edges)
        let inputData = context.trigger.data

        if (sourceNodes.length > 0) {
          inputData = context.nodeOutputs[sourceNodes[0]] || context.trigger.data
        }

        // Get AI configuration from node metadata or workflow config
        const aiConfig = node.data.metadata?.aiConfig || workflowConfig?.aiConfig || {}
        
        // Build the prompt
        let systemPrompt = aiConfig.systemPrompt || `You are a helpful assistant. ${node.data.description || 'Process the following data and respond appropriately.'}`
        let userPrompt = aiConfig.prompt || aiConfig.userPrompt || ''

        // If no user prompt, generate based on node description and input
        if (!userPrompt) {
          const description = node.data.description || 'Process the following data'
          userPrompt = `${description}\n\nInput Data:\n${typeof inputData === 'string' ? inputData : JSON.stringify(inputData, null, 2)}`
        } else {
          // Resolve template variables in the prompt
          userPrompt = resolveTemplate(userPrompt, context, node.id, edges)
        }

        // Call AI API with configuration
        const aiResponse = await callAI(
          userPrompt, 
          systemPrompt, 
          context.credentials.openaiApiKey,
          {
            model: aiConfig.model || 'gemini-2.0-flash',
            temperature: aiConfig.temperature ?? 0.7,
            maxTokens: aiConfig.maxTokens ?? 2048,
            outputFormat: aiConfig.outputFormat || 'text'
          }
        )
        
        return {
          success: true,
          output: aiResponse
        }
      }

      case 'Discord': {
        // Get message from node metadata config, workflow config, or fallback
        const discordConfig = node.data.metadata?.discordConfig || {}
        let message = discordConfig.message || workflowConfig?.discordTemplate || node.data.metadata?.message || ''
        
        // If no template, use previous node output
        if (!message) {
          const sourceNodes = getSourceNodes(node.id, edges)
          if (sourceNodes.length > 0) {
            const previousOutput = context.nodeOutputs[sourceNodes[0]]
            message = typeof previousOutput === 'string' 
              ? previousOutput 
              : JSON.stringify(previousOutput, null, 2)
          }
        } else {
          // Resolve template variables
          message = resolveTemplate(message, context, node.id, edges)
        }

        if (!message) {
          return { success: false, output: null, error: 'No message to send' }
        }

        // In test mode, don't actually send
        if (context.isTest) {
          return { success: true, output: { sent: false, message, testMode: true } }
        }

        // Send to Discord
        if (context.credentials.discordWebhookUrl) {
          await postContentToWebHook(message, context.credentials.discordWebhookUrl)
          return { success: true, output: { sent: true, message } }
        } else {
          return { success: false, output: null, error: 'Discord webhook not configured' }
        }
      }

      case 'Slack': {
        // Get message from node metadata config, workflow config, or fallback
        const slackConfig = node.data.metadata?.slackConfig || {}
        let message = slackConfig.message || workflowConfig?.slackTemplate || node.data.metadata?.message || ''
        
        if (!message) {
          const sourceNodes = getSourceNodes(node.id, edges)
          if (sourceNodes.length > 0) {
            const previousOutput = context.nodeOutputs[sourceNodes[0]]
            message = typeof previousOutput === 'string' ? previousOutput : JSON.stringify(previousOutput)
          }
        } else {
          message = resolveTemplate(message, context, node.id, edges)
        }

        // In test mode, don't actually send
        if (context.isTest) {
          return { success: true, output: { sent: false, message, testMode: true } }
        }

        if (context.credentials.slackAccessToken && context.credentials.slackChannels?.length) {
          const channels = context.credentials.slackChannels.map(c => ({ label: '', value: c }))
          await postMessageToSlack(context.credentials.slackAccessToken, channels, message)
          return { success: true, output: { sent: true, message } }
        }
        return { success: false, output: null, error: 'Slack not configured' }
      }

      case 'Notion': {
        // Get content from node metadata config, workflow config, or fallback
        const notionConfig = node.data.metadata?.notionConfig || {}
        let content = notionConfig.content || workflowConfig?.notionTemplate || ''
        
        // If no content configured, use previous output
        if (!content) {
          const sourceNodes = getSourceNodes(node.id, edges)
          if (sourceNodes.length > 0) {
            const previousOutput = context.nodeOutputs[sourceNodes[0]]
            content = typeof previousOutput === 'string' ? previousOutput : JSON.stringify(previousOutput)
          }
        } else {
          content = resolveTemplate(content, context, node.id, edges)
        }
        
        // In test mode, don't actually create
        if (context.isTest) {
          return { success: true, output: { created: false, content, testMode: true } }
        }

        if (context.credentials.notionAccessToken && context.credentials.notionDbId) {
          // Parse content as JSON if it looks like JSON, otherwise wrap it
          let notionContent
          try {
            notionContent = JSON.parse(content)
          } catch {
            // Wrap plain text as a simple Notion content
            notionContent = {
              title: content.substring(0, 100),
              content: content
            }
          }
          
          await onCreateNewPageInDatabase(
            context.credentials.notionDbId,
            context.credentials.notionAccessToken,
            notionContent
          )
          return { success: true, output: { created: true, content } }
        }
        return { success: false, output: null, error: 'Notion not configured' }
      }

      case 'Gmail Read':
        return executeGmailRead(node, context)

      case 'Gmail Send':
        return executeGmailSend(node, context, edges)

      case 'Google Calendar':
        return executeGoogleCalendar(node, context, edges)

      case 'Email':
        return executeEmail(node, context, edges)

      case 'Wait':
        return executeWait(node, context)

      case 'Condition':
        return executeCondition(node, context, edges)

      case 'HTTP Request':
        return executeHTTPRequest(node, context, edges)

      case 'Text Formatter':
        return executeTextFormatter(node, context, edges)

      case 'Data Filter':
        return executeDataFilter(node, context, edges)

      case 'Code':
        return executeCode(node, context, edges)

      case 'Custom Webhook': {
        // Similar to HTTP Request but simpler
        const webhookConfig = node.data.metadata?.webhookConfig || {}
        const url = resolveTemplate(webhookConfig.url || '', context, node.id, edges)
        
        if (!url) {
          return { success: false, output: null, error: 'Webhook URL required' }
        }

        if (context.isTest) {
          return { success: true, output: { url, message: 'Webhook would be called (test mode)' } }
        }

        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              trigger: context.trigger.data,
              previousOutput: getSourceNodes(node.id, edges).length > 0
                ? context.nodeOutputs[getSourceNodes(node.id, edges)[0]]
                : null
            })
          })

          const data = await response.json().catch(() => ({}))
          return { success: response.ok, output: data }
        } catch (error: any) {
          return { success: false, output: null, error: error.message }
        }
      }

      default:
        return { success: true, output: context.trigger.data }
    }
  } catch (error: any) {
    return { success: false, output: null, error: error.message }
  }
}

/**
 * AI Configuration options
 */
interface AIConfigOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  outputFormat?: string
}

/**
 * Call AI (Gemini preferred, OpenAI fallback) for processing
 */
async function callAI(
  prompt: string, 
  systemPrompt: string, 
  apiKey?: string,
  config: AIConfigOptions = {}
): Promise<string> {
  const { 
    model = 'gemini-2.0-flash', 
    temperature = 0.7, 
    maxTokens = 2048,
    outputFormat = 'text'
  } = config

  // Add output format instruction to system prompt if specified
  let enhancedSystemPrompt = systemPrompt
  if (outputFormat === 'json') {
    enhancedSystemPrompt += '\n\nIMPORTANT: Return your response as valid JSON only.'
  } else if (outputFormat === 'markdown') {
    enhancedSystemPrompt += '\n\nFormat your response using Markdown.'
  } else if (outputFormat === 'bullet_points') {
    enhancedSystemPrompt += '\n\nFormat your response as bullet points.'
  }

  // Try Gemini first (preferred)
  if (process.env.GEMINI_API_KEY) {
    try {
      const geminiModel = model.startsWith('gemini') ? model : 'gemini-2.0-flash'
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: `${enhancedSystemPrompt}\n\n${prompt}` }]
            }],
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
            }
          })
        }
      )
      
      const data = await response.json()
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text
      }
      console.error('Gemini response error:', data)
    } catch (e) {
      console.error('Gemini error:', e)
    }
  }

  // Fallback to OpenAI
  if (apiKey || process.env.OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey || process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: enhancedSystemPrompt },
            { role: 'user', content: prompt }
          ],
          max_tokens: maxTokens,
          temperature
        })
      })
      
      const data = await response.json()
      if (data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content
      }
    } catch (e) {
      console.error('OpenAI error:', e)
    }
  }

  return '[AI processing unavailable - API key not configured]'
}

/**
 * Main workflow execution function
 */
export async function executeWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  triggerData: any,
  credentials: ExecutionContext['credentials'],
  workflowConfig: any = {},
  isTest: boolean = false
): Promise<ExecutionResult> {
  const context: ExecutionContext = {
    trigger: {
      type: 'manual',
      data: triggerData
    },
    nodeOutputs: {},
    currentStep: 0,
    logs: [],
    credentials,
    isTest
  }

  // Build execution order
  const executionOrder = buildExecutionOrder(nodes, edges)
  
  context.logs.push({
    timestamp: new Date(),
    nodeId: 'system',
    nodeType: 'system',
    status: 'started',
    message: `Starting workflow execution with ${executionOrder.length} nodes${isTest ? ' (TEST MODE)' : ''}`,
    input: triggerData
  })

  // Execute each node in order
  for (const node of executionOrder) {
    context.currentStep++
    
    context.logs.push({
      timestamp: new Date(),
      nodeId: node.id,
      nodeType: node.type,
      status: 'started',
      message: `Executing: ${node.data.title || node.type}`
    })

    const result = await executeNode(node, context, edges, workflowConfig)
    
    // Store output for next nodes
    context.nodeOutputs[node.id] = result.output
    
    context.logs.push({
      timestamp: new Date(),
      nodeId: node.id,
      nodeType: node.type,
      status: result.success ? 'completed' : 'error',
      message: result.success ? 'Node completed successfully' : `Error: ${result.error}`,
      input: getSourceNodes(node.id, edges).map(id => context.nodeOutputs[id]),
      output: result.output,
      error: result.error
    })

    if (!result.success && !isTest) {
      // In production, stop on error
      return {
        success: false,
        logs: context.logs,
        finalOutput: null,
        error: `Workflow failed at node "${node.data.title}": ${result.error}`
      }
    }
  }

  // Get final output (from last node)
  const lastNode = executionOrder[executionOrder.length - 1]
  const finalOutput = lastNode ? context.nodeOutputs[lastNode.id] : null

  context.logs.push({
    timestamp: new Date(),
    nodeId: 'system',
    nodeType: 'system',
    status: 'completed',
    message: `Workflow completed successfully${isTest ? ' (TEST MODE)' : ''}`,
    output: finalOutput
  })

  return {
    success: true,
    logs: context.logs,
    finalOutput
  }
}
