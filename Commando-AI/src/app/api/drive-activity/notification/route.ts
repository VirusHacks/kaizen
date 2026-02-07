import { db } from '@/lib/db'
import { executeWorkflow, WorkflowNode, WorkflowEdge } from '@/lib/workflow-executor'
import { google } from 'googleapis'
import { headers } from 'next/headers'
import { NextRequest } from 'next/server'

// Helper to fetch changed file details from Google Drive
async function getChangedFileDetails(accessToken: string) {
  try {
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: accessToken })
    
    const drive = google.drive({ version: 'v3', auth: oauth2Client })
    
    // Get recent changes
    const response = await drive.files.list({
      orderBy: 'modifiedTime desc',
      pageSize: 1,
      fields: 'files(id, name, mimeType, modifiedTime)',
    })
    
    if (response.data.files && response.data.files.length > 0) {
      const file = response.data.files[0]
      
      // Try to get file content for text files
      let content = ''
      if (file.mimeType?.includes('text') || 
          file.mimeType?.includes('document') ||
          file.mimeType?.includes('json')) {
        try {
          const exportMime = file.mimeType?.includes('document') ? 'text/plain' : undefined
          if (exportMime) {
            const exported = await drive.files.export({
              fileId: file.id!,
              mimeType: exportMime,
            })
            content = exported.data as string
          } else {
            const downloaded = await drive.files.get({
              fileId: file.id!,
              alt: 'media',
            })
            content = typeof downloaded.data === 'string' ? downloaded.data : JSON.stringify(downloaded.data)
          }
        } catch (e) {
          console.log('Could not fetch file content:', e)
        }
      }
      
      return {
        fileId: file.id,
        fileName: file.name,
        mimeType: file.mimeType,
        modifiedTime: file.modifiedTime,
        content: content.substring(0, 5000), // Limit content size
      }
    }
    
    return null
  } catch (error) {
    console.error('Failed to get file details:', error)
    return null
  }
}

export async function POST(req: NextRequest) {
  console.log('🔔 Drive notification received')
  
  const headersList = headers()
  let channelResourceId: string | undefined
  
  headersList.forEach((value, key) => {
    if (key == 'x-goog-resource-id') {
      channelResourceId = value
    }
  })

  console.log('📌 Channel Resource ID:', channelResourceId)

  if (!channelResourceId) {
    console.log('⚠️ No channel resource ID in headers')
    return Response.json({ message: 'No resource ID' }, { status: 200 })
  }

  // Find user by Google resource ID
  const user = await db.user.findFirst({
    where: {
      googleResourceId: channelResourceId,
    },
    select: { clerkId: true, credits: true },
  })
  
  console.log('👤 User found:', user?.clerkId, 'Credits:', user?.credits)
  
  if (!user) {
    console.log('⚠️ No user found for resource ID:', channelResourceId)
    return Response.json({ message: 'User not found' }, { status: 200 })
  }

  // Check credits
  const hasCredits = (user.credits && parseInt(user.credits) > 0) || user.credits === 'Unlimited'
  if (!hasCredits) {
    console.log('⚠️ User has no credits')
    return Response.json({ message: 'No credits' }, { status: 200 })
  }

  // Get user's Google credentials for fetching file details
  const localGoogleCredential = await db.localGoogleCredential.findFirst({
    where: { userId: user.clerkId ? await db.user.findUnique({ where: { clerkId: user.clerkId } }).then(u => u?.id) : undefined },
  })

  // Get changed file details
  let triggerData: any = {
    event: 'file_changed',
    timestamp: new Date().toISOString(),
  }
  
  if (localGoogleCredential?.accessToken) {
    const fileDetails = await getChangedFileDetails(localGoogleCredential.accessToken)
    if (fileDetails) {
      triggerData = {
        ...triggerData,
        ...fileDetails,
      }
      console.log('📄 File changed:', fileDetails.fileName)
    }
  }

  // Only get PUBLISHED workflows with Google Drive trigger
  const workflows = await db.workflows.findMany({
    where: {
      userId: user.clerkId,
      publish: true,
    },
  })
  
  console.log('📋 Found', workflows.length, 'published workflows')
  
  if (!workflows || workflows.length === 0) {
    console.log('⚠️ No published workflows found')
    return Response.json({ message: 'No workflows' }, { status: 200 })
  }

  // Get credentials for workflow execution
  const discordWebhook = await db.discordWebhook.findFirst({
    where: { userId: user.clerkId },
    select: { url: true },
  })

  const slackCredential = await db.slack.findFirst({
    where: { userId: user.clerkId },
    select: { slackAccessToken: true },
  })

  const notionCredential = await db.notion.findFirst({
    where: { userId: user.clerkId },
    select: { accessToken: true },
  })

  const credentials = {
    googleAccessToken: localGoogleCredential?.accessToken || undefined,
    discordWebhookUrl: discordWebhook?.url || undefined,
    slackAccessToken: slackCredential?.slackAccessToken || undefined,
    notionAccessToken: notionCredential?.accessToken || undefined,
    openaiApiKey: process.env.OPENAI_API_KEY,
  }

  // Process each workflow using the new executor
  for (const flow of workflows) {
    console.log('🔄 Processing workflow:', flow.id, '-', flow.name)
    
    // Parse nodes and edges
    let nodes: WorkflowNode[] = []
    let edges: WorkflowEdge[] = []
    
    try {
      if (flow.nodes) {
        nodes = JSON.parse(flow.nodes)
      }
      if (flow.edges) {
        edges = JSON.parse(flow.edges)
      }
    } catch (e) {
      console.error('❌ Failed to parse workflow nodes/edges:', e)
      continue
    }

    // Check if workflow starts with Google Drive trigger
    const hasDriveTrigger = nodes.some(node => 
      node.type === 'Trigger' || node.type === 'Google Drive'
    )
    
    if (!hasDriveTrigger) {
      console.log('⏭️ Workflow does not have Drive trigger, skipping')
      continue
    }

    // Execute workflow with the new executor
    try {
      const result = await executeWorkflow(
        nodes,
        edges,
        triggerData,
        credentials,
        { workflowId: flow.id, userId: user.clerkId },
        false  // isTest = false
      )
      
      console.log('✅ Workflow completed:', flow.name, 'Success:', result.success)
      
      // Log any errors
      result.logs
        .filter(log => log.status === 'error')
        .forEach(log => console.error('  ❌', log.message, log.error))
        
    } catch (error) {
      console.error('❌ Workflow execution failed:', flow.name, error)
    }
  }

  // Deduct credits (only once per notification)
  if (user.credits !== 'Unlimited') {
    await db.user.update({
      where: { clerkId: user.clerkId },
      data: { credits: `${parseInt(user.credits!) - 1}` },
    })
    console.log('💰 Credits deducted. Remaining:', parseInt(user.credits!) - 1)
  }

  return Response.json({ message: 'flow completed' }, { status: 200 })
}
