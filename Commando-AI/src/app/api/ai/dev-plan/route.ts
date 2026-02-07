import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { GoogleGenAI } from '@google/genai'
import { getProjectContext } from '@/app/(main)/(pages)/projects/[projectId]/project-manager/_actions/context-actions'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId, issueId, issueTitle, issueDescription, issueType, parentTitle } = await req.json()

    if (!projectId || !issueTitle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get project context for tech stack info
    const context = await getProjectContext(projectId)

    const systemPrompt = `You are a senior software engineer helping a developer break down a task into a step-by-step implementation plan.

${context ? `## PROJECT CONTEXT
- **Project:** ${context.name} (${context.key})
- **Tech Stack:** ${context.setup?.techStack || 'Not specified'}
- **Vision:** ${context.setup?.vision || 'Not specified'}
${context.setup?.aiInstructions ? `- **Special Instructions:** ${context.setup.aiInstructions}` : ''}` : ''}

You MUST respond with a valid JSON object (no markdown code fences) with this exact structure:
{
  "summary": "Brief 1-2 sentence summary of what needs to be done",
  "estimatedTime": "Estimated time (e.g., '2-4 hours', '1 day')",
  "acceptanceCriteria": ["Criterion 1", "Criterion 2", ...],
  "steps": [
    {
      "step": 1,
      "title": "Step title",
      "description": "Detailed description of what to do",
      "category": "architecture|file_changes|database|integration|testing",
      "files": ["src/path/to/file.ts"],
      "commands": ["npm install package"]
    }
  ]
}

Rules:
- Generate 4-8 concrete, actionable steps
- Each step should be small enough to complete in 15-30 minutes
- Include specific file paths based on the tech stack (use common conventions)
- Include terminal commands where relevant (install, migrate, generate, etc.)
- Categories: "architecture" for setup/design, "file_changes" for code, "database" for DB/models, "integration" for API/services, "testing" for tests
- Acceptance criteria should be verifiable outcomes
- Be specific to the tech stack when known
- For bugs, include reproduction verification and regression test steps`

    const userPrompt = `Generate an implementation plan for this ${issueType}:

**Title:** ${issueTitle}
${issueDescription ? `**Description:** ${issueDescription}` : ''}
${parentTitle ? `**Parent Story/Epic:** ${parentTitle}` : ''}

Provide a detailed, actionable step-by-step plan.`

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    })

    const text = response.text || ''

    // Parse JSON from response (handle potential markdown wrapping)
    let plan
    try {
      // Try direct parse first
      plan = JSON.parse(text)
    } catch {
      // Try extracting JSON from markdown code block
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        plan = JSON.parse(jsonMatch[1].trim())
      } else {
        // Try finding JSON object in text
        const braceStart = text.indexOf('{')
        const braceEnd = text.lastIndexOf('}')
        if (braceStart !== -1 && braceEnd !== -1) {
          plan = JSON.parse(text.slice(braceStart, braceEnd + 1))
        } else {
          throw new Error('Could not parse AI response as JSON')
        }
      }
    }

    return NextResponse.json({ plan })
  } catch (error) {
    console.error('[DEV_PLAN_API]', error)
    return NextResponse.json(
      { error: 'Failed to generate implementation plan' },
      { status: 500 }
    )
  }
}
