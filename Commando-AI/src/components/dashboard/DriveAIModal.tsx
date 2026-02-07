'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bot, Send, Loader2, FolderOpen, File, CheckCircle2, XCircle, Trash2, Edit } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface DriveFile {
  id: string
  name: string
  mimeType: string
  iconLink: string
  webViewLink: string
  createdTime: string
  modifiedTime: string
  size: string
  parents?: string[]
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  action?: 'create_file' | 'update_file' | 'delete_file' | 'search' | 'answer' | 'error'
  fileData?: any
}

interface DriveAIModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  files: DriveFile[]
  onFileChanged?: () => void
}

export function DriveAIModal({ open, onOpenChange, files, onFileChanged }: DriveAIModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your AI Google Drive assistant. I can help you:\n\n• Create files and folders (e.g., 'Create a folder called Projects')\n• Update files (e.g., 'Rename file.txt to document.txt')\n• Delete files (e.g., 'Delete the file called old-doc.txt')\n• Search files (e.g., 'Find all PDF files')\n• Answer questions about your Drive\n\nWhat would you like to do?",
      timestamp: new Date(),
      action: 'answer'
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setConversationHistory(prev => [...prev, { role: 'user', content: input.trim() }])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/drive/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input.trim(),
          files: files,
          conversationHistory: conversationHistory
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get AI response')
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || data.message || 'I understand. How can I help you further?',
        timestamp: new Date(),
        action: data.action || 'answer',
        fileData: data.file
      }

      setMessages(prev => [...prev, assistantMessage])
      setConversationHistory(prev => [...prev, { role: 'assistant', content: assistantMessage.content }])

      // Handle different actions
      if (data.action === 'create_file' && data.file) {
        await createFile(data.file)
      } else if (data.action === 'update_file' && data.file) {
        await updateFile(data.file)
      } else if (data.action === 'delete_file' && data.file) {
        await deleteFile(data.file)
      }
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error.message || "I'm sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
        action: 'error'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const findFileByName = (name: string): DriveFile | undefined => {
    return files.find(f => 
      f.name.toLowerCase() === name.toLowerCase() ||
      f.name.toLowerCase().includes(name.toLowerCase())
    )
  }

  const findFolderByName = (name: string): DriveFile | undefined => {
    return files.find(f => 
      f.mimeType === 'application/vnd.google-apps.folder' &&
      (f.name.toLowerCase() === name.toLowerCase() ||
       f.name.toLowerCase().includes(name.toLowerCase()))
    )
  }

  const createFile = async (fileData: any) => {
    try {
      setIsLoading(true)

      if (!fileData.name) {
        throw new Error('File name is required')
      }

      // If parentId is a folder name, find the folder ID
      let parentId = fileData.parentId
      if (parentId && !parentId.startsWith('1')) {
        const folder = findFolderByName(parentId)
        if (folder) {
          parentId = folder.id
        } else {
          parentId = undefined // Create in root if folder not found
        }
      }

      const response = await fetch('/api/drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: fileData.name,
          mimeType: fileData.mimeType || 'text/plain',
          parentId: parentId,
          content: fileData.content || ''
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create file')
      }

      const successMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `✅ ${fileData.mimeType === 'application/vnd.google-apps.folder' ? 'Folder' : 'File'} "${fileData.name}" created successfully!`,
        timestamp: new Date(),
        action: 'answer',
        fileData: data.file
      }

      setMessages(prev => [...prev, successMessage])
      setConversationHistory(prev => [...prev, { role: 'assistant', content: successMessage.content }])

      if (onFileChanged) {
        onFileChanged()
      }
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `❌ Failed to create file: ${error.message}`,
        timestamp: new Date(),
        action: 'error'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const updateFile = async (fileData: any) => {
    try {
      setIsLoading(true)

      // If fileId is a name, find the file
      let fileId = fileData.fileId
      if (!fileId || !fileId.startsWith('1')) {
        const file = findFileByName(fileId || fileData.name || '')
        if (!file) {
          throw new Error(`File "${fileId || fileData.name}" not found`)
        }
        fileId = file.id
      }

      // If parentId is a folder name, find the folder ID
      let parentId = fileData.parentId
      if (parentId && !parentId.startsWith('1')) {
        const folder = findFolderByName(parentId)
        if (folder) {
          parentId = folder.id
        } else {
          parentId = undefined
        }
      }

      const response = await fetch('/api/drive', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: fileId,
          name: fileData.name,
          parentId: parentId,
          content: fileData.content
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update file')
      }

      const successMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `✅ File updated successfully!`,
        timestamp: new Date(),
        action: 'answer',
        fileData: data.file
      }

      setMessages(prev => [...prev, successMessage])
      setConversationHistory(prev => [...prev, { role: 'assistant', content: successMessage.content }])

      if (onFileChanged) {
        onFileChanged()
      }
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `❌ Failed to update file: ${error.message}`,
        timestamp: new Date(),
        action: 'error'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const deleteFile = async (fileData: any) => {
    try {
      setIsLoading(true)

      // If fileId is a name, find the file
      let fileId = fileData.fileId
      if (!fileId || !fileId.startsWith('1')) {
        const file = findFileByName(fileId || fileData.name || '')
        if (!file) {
          throw new Error(`File "${fileId || fileData.name}" not found`)
        }
        fileId = file.id
      }

      const response = await fetch(`/api/drive?fileId=${fileId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete file')
      }

      const successMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `✅ File deleted successfully!`,
        timestamp: new Date(),
        action: 'answer'
      }

      setMessages(prev => [...prev, successMessage])
      setConversationHistory(prev => [...prev, { role: 'assistant', content: successMessage.content }])

      if (onFileChanged) {
        onFileChanged()
      }
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `❌ Failed to delete file: ${error.message}`,
        timestamp: new Date(),
        action: 'error'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatFilePreview = (fileData: any) => {
    if (!fileData) return null

    const isFolder = fileData.mimeType === 'application/vnd.google-apps.folder'

    return (
      <div className="mt-2 p-3 bg-muted rounded-lg border border-primary/20">
        <div className="flex items-start gap-2">
          {isFolder ? (
            <FolderOpen className="h-4 w-4 text-primary mt-0.5" />
          ) : (
            <File className="h-4 w-4 text-primary mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-semibold text-sm">{fileData.name || 'Untitled'}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {isFolder ? 'Folder' : `File (${fileData.mimeType || 'Unknown type'})`}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            AI Drive Assistant
          </DialogTitle>
          <DialogDescription>
            Ask me to create, update, delete, or search files and folders
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-4" ref={scrollAreaRef}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg px-4 py-2.5',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.fileData && formatFilePreview(message.fileData)}
                  <p className="text-xs opacity-70 mt-1.5">
                    {format(message.timestamp, 'h:mm a')}
                  </p>
                </div>
                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <FolderOpen className="h-4 w-4 text-primary" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t px-6 py-4">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me to create a folder, update a file, or search..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Try: "Create a folder called Projects" or "Delete the file named old-doc.txt"
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

