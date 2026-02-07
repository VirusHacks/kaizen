import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { executeWorkflow, WorkflowNode, WorkflowEdge } from '@/lib/workflow-executor'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for workflow execution

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workflowId, testData } = body

    if (!workflowId) {
      return NextResponse.json({ error: 'workflowId is required' }, { status: 400 })
    }

    // Get workflow from database
    const workflow = await db.workflows.findUnique({
      where: { id: workflowId },
    })

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    // Verify ownership
    if (workflow.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Parse nodes and edges
    let nodes: WorkflowNode[] = []
    let edges: WorkflowEdge[] = []

    try {
      nodes = workflow.nodes ? JSON.parse(workflow.nodes) : []
      edges = workflow.edges ? JSON.parse(workflow.edges) : []
    } catch (e) {
      return NextResponse.json({ error: 'Invalid workflow data' }, { status: 400 })
    }

    if (nodes.length === 0) {
      return NextResponse.json({ error: 'Workflow has no nodes' }, { status: 400 })
    }

    // Get user credentials
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    const googleAccessToken = user.privateMetadata?.googleAccessToken as string | undefined

    // Get Discord webhook
    const discordWebhook = await db.discordWebhook.findFirst({
      where: { userId },
      select: { url: true }
    })

    // Get Slack credentials
    const slack = await db.slack.findFirst({
      where: { userId },
      select: { slackAccessToken: true }
    })

    // Get Notion credentials
    const notion = await db.notion.findFirst({
      where: { userId },
      select: { accessToken: true, databaseId: true }
    })

    // Build credentials object
    const credentials = {
      googleAccessToken,
      discordWebhookUrl: discordWebhook?.url,
      slackAccessToken: workflow.slackAccessToken || slack?.slackAccessToken,
      slackChannels: workflow.slackChannels || [],
      notionAccessToken: workflow.notionAccessToken || notion?.accessToken,
      notionDbId: workflow.notionDbId || notion?.databaseId,
      openaiApiKey: process.env.OPENAI_API_KEY,
    }

    // Build workflow config from workflow data
    const workflowConfig = {
      discordTemplate: workflow.discordTemplate,
      slackTemplate: workflow.slackTemplate,
      notionTemplate: workflow.notionTemplate,
    }

    // Default test data if not provided
    const triggerData = testData || {
      type: 'test',
      name: 'Test File.pdf',
      fileName: 'Test File.pdf',
      mimeType: 'application/pdf',
      content: 'This is sample content from a test file for workflow testing.',
      timestamp: new Date().toISOString(),
    }

    // Execute the workflow in test mode
    const result = await executeWorkflow(
      nodes,
      edges,
      triggerData,
      credentials,
      workflowConfig,
      true // isTest = true
    )

    return NextResponse.json({
      success: result.success,
      logs: result.logs,
      finalOutput: result.finalOutput,
      error: result.error,
      nodeCount: nodes.length,
      edgeCount: edges.length,
    })

  } catch (error: any) {
    console.error('Workflow test error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to test workflow' },
      { status: 500 }
    )
  }
}
