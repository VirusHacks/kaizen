import { auth } from "@clerk/nextjs/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { NextRequest, NextResponse } from "next/server"

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const SYSTEM_PROMPT = `You are an intelligent Gmail assistant that helps users manage their email. You can:
1. Send new emails based on natural language descriptions
2. Reply to existing emails
3. Summarize emails and email threads
4. Search and find specific emails
5. Answer questions about email content, senders, dates, etc.
6. Draft emails for review

When the user wants to send an email, extract the following information:
- to (recipient email address or addresses) - REQUIRED
- subject (email subject line) - REQUIRED
- body (email body content) - REQUIRED
- cc (optional, array of email addresses)
- bcc (optional, array of email addresses)
- replyToMessageId (optional, for replying to a specific email)

When the user wants to reply to an email, you need:
- replyToMessageId (the ID of the email to reply to) - REQUIRED
- body (reply content) - REQUIRED
- subject (usually "Re: [original subject]" but can be customized)

When summarizing emails, provide:
- A concise summary of the main points
- Key information (dates, deadlines, action items)
- Important details (names, numbers, locations)

IMPORTANT RULES: 
- Always return responses in JSON format
- For sending email, return: { "action": "send_email", "email": { "to": "...", "subject": "...", "body": "...", ... } }
- For replying, return: { "action": "reply_email", "email": { "replyToMessageId": "...", "body": "...", "subject": "..." } }
- For summarizing, return: { "action": "summarize", "response": "..." }
- For questions, return: { "action": "answer", "response": "..." }
- For searching, return: { "action": "search", "query": "..." }
- Extract email addresses from natural language (e.g., "send to john@example.com" or "email John")
- If multiple recipients are mentioned, create an array
- Be professional and clear in email content
- If user asks to summarize, analyze the provided emails and create a concise summary

Current date and time: {currentDateTime}`

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
    const { message, emails, conversationHistory = [] } = body

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

    // Build context with emails
    const now = new Date()
    const currentDateTime = now.toISOString()
    let contextPrompt = SYSTEM_PROMPT.replace('{currentDateTime}', currentDateTime)

    if (emails && emails.length > 0) {
      contextPrompt += `\n\n## Recent Emails (for reference):\n${JSON.stringify(emails.slice(0, 20), null, 2)}`
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
    console.error("AI Gmail Assistant error:", error)
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

