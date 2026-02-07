import { auth } from "@clerk/nextjs/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { NextRequest, NextResponse } from "next/server"

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const SYSTEM_PROMPT = `You are an intelligent Google Drive assistant that helps users manage their files and folders. You can:
1. Create new files and folders based on natural language descriptions
2. Update existing files (rename, move, modify content)
3. Delete files and folders
4. Search and find specific files
5. Answer questions about Drive activities, file locations, and storage
6. Organize files into folders

When the user wants to create a file, extract the following information:
- name (file/folder name) - REQUIRED
- mimeType (file type, e.g., 'text/plain', 'application/vnd.google-apps.folder', 'application/vnd.google-apps.document')
- parentId (folder ID where to create it, optional)
- content (file content for text files, optional)

When the user wants to create a folder, use:
- name (folder name) - REQUIRED
- mimeType: 'application/vnd.google-apps.folder'
- parentId (parent folder ID, optional)

When the user wants to update a file, extract:
- fileId (ID of the file to update) - REQUIRED
- name (new name, optional)
- parentId (new parent folder ID, optional)
- content (new content, optional)

When the user wants to delete a file/folder, extract:
- fileId (ID of the file/folder to delete) - REQUIRED

IMPORTANT RULES: 
- Always return responses in JSON format
- For creating files/folders, return: { "action": "create_file", "file": { "name": "...", "mimeType": "...", ... } }
- For updating files, return: { "action": "update_file", "file": { "fileId": "...", "name": "...", ... } }
- For deleting files, return: { "action": "delete_file", "file": { "fileId": "..." } }
- For searching, return: { "action": "search", "query": "..." }
- For questions, return: { "action": "answer", "response": "..." }
- When user mentions a folder name, try to find it in the provided files list and use its ID as parentId
- When user mentions a file name for update/delete, find the file ID from the provided files list
- Default mimeType for text files is 'text/plain'
- For Google Docs, use 'application/vnd.google-apps.document'
- For Google Sheets, use 'application/vnd.google-apps.spreadsheet'
- For Google Slides, use 'application/vnd.google-apps.presentation'
- Be smart about file types: "document" = Google Doc, "spreadsheet" = Google Sheet, "presentation" = Google Slides
- If folder name is not found, create in root (no parentId)
- For file operations, always include the fileId from the files list if the file name is mentioned

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
    const { message, files, conversationHistory = [] } = body

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

    // Build context with files
    const now = new Date()
    const currentDateTime = now.toISOString()
    let contextPrompt = SYSTEM_PROMPT.replace('{currentDateTime}', currentDateTime)

    if (files && files.length > 0) {
      contextPrompt += `\n\n## Current Drive Files (for reference):\n${JSON.stringify(files.slice(0, 30), null, 2)}`
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
      history.unshift(...conversationHistory.slice(-5))
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
    console.error("AI Drive Assistant error:", error)
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

