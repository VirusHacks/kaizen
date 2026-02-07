import { GoogleGenerativeAI } from "@google/generative-ai"
import { NextRequest, NextResponse } from "next/server"

// Node type definitions for the AI prompt
const NODE_TYPES = {
  'Google Drive': { description: 'Connect with Google Drive to watch for file changes', type: 'Trigger' },
  'Trigger': { description: 'A generic event that starts the workflow', type: 'Trigger' },
  'Slack': { description: 'Send a notification message to a Slack channel', type: 'Action' },
  'Discord': { description: 'Post messages to a Discord server channel', type: 'Action' },
  'Notion': { description: 'Create entries or pages directly in Notion', type: 'Action' },
  'Email': { description: 'Send an email to a user', type: 'Action' },
  'AI': { description: 'Use AI to process, summarize, or transform data', type: 'Action' },
  'Condition': { description: 'Boolean operator to branch workflow based on conditions', type: 'Action' },
  'Wait': { description: 'Delay the next action step by a specified time', type: 'Action' },
  'Custom Webhook': { description: 'Connect any app that supports webhooks', type: 'Action' },
  'Google Calendar': { description: 'Create a calendar invite or event', type: 'Action' },
}

const SYSTEM_PROMPT = `You are a workflow automation assistant for Commando-AI, a visual automation platform similar to Zapier or n8n.

Your task is to generate workflow automations based on user descriptions in natural language.

## Available Node Types:
${Object.entries(NODE_TYPES).map(([name, info]) => `- **${name}** (${info.type}): ${info.description}`).join('\n')}

## Rules:
1. Every workflow MUST start with exactly ONE trigger node (Google Drive or Trigger)
2. Triggers must be the first node (position x: 100)
3. Actions follow triggers and connect sequentially
4. Position nodes in a readable horizontal flow: each subsequent node should be x + 350 from the previous
5. All nodes should have y: 200 for a clean horizontal layout
6. Generate meaningful titles and descriptions for each node based on the user's intent
7. Create logical edge connections from source to target (flow left to right)

## Output Format:
Return a valid JSON object with this exact structure:
{
  "name": "Short descriptive workflow name",
  "description": "One sentence describing what this workflow does",
  "nodes": [
    {
      "type": "Google Drive",
      "title": "Watch for new files",
      "description": "Triggers when a new file is added to Google Drive",
      "position": { "x": 100, "y": 200 }
    },
    {
      "type": "AI",
      "title": "Summarize content",
      "description": "Use AI to create a summary of the file content",
      "position": { "x": 450, "y": 200 }
    }
  ],
  "edges": [
    { "sourceIndex": 0, "targetIndex": 1 }
  ],
  "suggestions": [
    "Consider adding error handling with a Condition node",
    "You could add a Wait node to avoid rate limits"
  ]
}

## Important:
- sourceIndex and targetIndex refer to the array index of nodes (0-based)
- Always return valid JSON, no markdown code blocks
- Keep suggestions helpful and actionable (2-3 max)
- If the user's request is unclear, make reasonable assumptions and note them in suggestions`

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    })

    const fullPrompt = `${SYSTEM_PROMPT}

## User Request:
"${prompt}"

Generate the workflow JSON:`

    const result = await model.generateContent(fullPrompt)
    const response = result.response
    const text = response.text()

    // Parse and validate the response
    let workflow
    try {
      workflow = JSON.parse(text)
    } catch {
      // Try to extract JSON from the response if it contains extra text
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        workflow = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Failed to parse AI response as JSON')
      }
    }

    // Validate workflow structure
    if (!workflow.nodes || !Array.isArray(workflow.nodes) || workflow.nodes.length === 0) {
      throw new Error('Invalid workflow: no nodes generated')
    }

    if (!workflow.edges || !Array.isArray(workflow.edges)) {
      workflow.edges = []
    }

    // Validate that first node is a trigger
    const firstNodeType = workflow.nodes[0]?.type
    const nodeInfo = NODE_TYPES[firstNodeType as keyof typeof NODE_TYPES]
    if (!nodeInfo || nodeInfo.type !== 'Trigger') {
      // Auto-fix by adding a trigger at the start
      workflow.nodes.unshift({
        type: 'Trigger',
        title: 'Workflow Trigger',
        description: 'Starts the automation workflow',
        position: { x: 100, y: 200 }
      })
      // Shift all positions and edge indices
      workflow.nodes.slice(1).forEach((node: any, index: number) => {
        node.position.x = 100 + (index + 1) * 350
      })
      workflow.edges = workflow.edges.map((edge: any) => ({
        sourceIndex: edge.sourceIndex + 1,
        targetIndex: edge.targetIndex + 1
      }))
      // Add edge from trigger to first action
      workflow.edges.unshift({ sourceIndex: 0, targetIndex: 1 })
    }

    // Ensure only valid node types
    workflow.nodes = workflow.nodes.filter((node: any) => {
      return NODE_TYPES[node.type as keyof typeof NODE_TYPES] !== undefined
    })

    return NextResponse.json({
      success: true,
      workflow: {
        name: workflow.name || 'Generated Workflow',
        description: workflow.description || 'AI-generated automation workflow',
        nodes: workflow.nodes,
        edges: workflow.edges,
        suggestions: workflow.suggestions || []
      }
    })

  } catch (error) {
    console.error('Error generating workflow:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate workflow',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
