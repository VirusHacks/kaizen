import { auth } from "@clerk/nextjs/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { NextRequest, NextResponse } from "next/server"

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const SYSTEM_PROMPT = `You are an intelligent calendar assistant that helps users manage their Google Calendar. You can:
1. Read and understand calendar events
2. Create new events based on natural language descriptions
3. Answer questions about calendar availability, upcoming events, and scheduling
4. Help users find free time slots
5. Suggest optimal meeting times

When the user wants to create an event, extract the following information:
- summary (title of the event) - REQUIRED
- startDateTime (ISO 8601 format with timezone) - REQUIRED
- endDateTime (ISO 8601 format with timezone) - REQUIRED
- description (optional)
- location (optional)
- attendees (array of email addresses, optional)

IMPORTANT RULES: 
- Always return responses in JSON format
- For event creation, return: { "action": "create_event", "event": { "summary": "...", "startDateTime": "ISO8601", "endDateTime": "ISO8601", ... } }
- For questions, return: { "action": "answer", "response": "..." }
- For reading events, return: { "action": "read_events", "query": "..." }
- Use current date/time context when parsing relative dates (e.g., "tomorrow", "next week", "next Monday")
- Default event duration is 1 hour if not specified
- If only a date is given without time, assume 9:00 AM start time
- If only start time is given, assume duration is 1 hour
- Always use ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ (e.g., "2024-01-15T14:00:00.000Z")
- Parse times in user's local timezone context
- For "today", use the current date
- For "tomorrow", use current date + 1 day
- For days of week (e.g., "Monday"), find the next occurrence
- Be smart about time parsing: "2pm" = 14:00, "2:30pm" = 14:30, "14:00" = 14:00

Current date and time: {currentDateTime}
Current timezone: {timezone}`

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { message, events, conversationHistory = [] } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      )
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    })

    // Build context with calendar events
    const now = new Date()
    const currentDateTime = now.toISOString()
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    let contextPrompt = SYSTEM_PROMPT
      .replace('{currentDateTime}', currentDateTime)
      .replace('{timezone}', timezone)

    if (events && events.length > 0) {
      contextPrompt += `\n\n## Current Calendar Events (for reference):\n${JSON.stringify(events.slice(0, 20), null, 2)}`
    }

    // Build conversation history
    const history: ChatMessage[] = [
      {
        role: 'user',
        content: contextPrompt + `\n\nUser's current message: ${message}`
      }
    ]

    // Add conversation history if provided
    if (conversationHistory.length > 0) {
      // Add history before the current message
      history.unshift(...conversationHistory.slice(-5)) // Keep last 5 messages for context
    }

    // Generate response
    const chat = model.startChat({
      history: history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }))
    })

    const result = await chat.sendMessage(message)
    const response = result.response
    let aiResponse: any

    try {
      aiResponse = JSON.parse(response.text())
    } catch (e) {
      // If not JSON, treat as plain text answer
      aiResponse = {
        action: "answer",
        response: response.text()
      }
    }

    return NextResponse.json({
      success: true,
      ...aiResponse
    })
  } catch (error: any) {
    console.error("AI Calendar Assistant error:", error)
    return NextResponse.json(
      { 
        error: error?.message || "Failed to process AI request",
        action: "error",
        response: "I'm sorry, I encountered an error. Please try again."
      },
      { status: 500 }
    )
  }
}

