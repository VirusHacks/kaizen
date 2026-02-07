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
import { Bot, Send, Loader2, Mail, User, FileText, CheckCircle2, XCircle, Reply } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface Email {
  id: string
  threadId: string
  subject: string
  from: string
  snippet: string
  date: string
  isUnread: boolean
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  action?: 'send_email' | 'reply_email' | 'summarize' | 'answer' | 'search' | 'error'
  emailData?: any
}

interface GmailAIModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  emails: Email[]
  onEmailSent?: () => void
}

export function GmailAIModal({ open, onOpenChange, emails, onEmailSent }: GmailAIModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your AI Gmail assistant. I can help you:\n\n• Send emails (e.g., 'Send an email to john@example.com about the meeting')\n• Reply to emails (e.g., 'Reply to the latest email saying thanks')\n• Summarize emails (e.g., 'Summarize my last 5 emails')\n• Search emails (e.g., 'Find emails from last week')\n• Answer questions about your emails\n\nWhat would you like to do?",
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
    // Scroll to bottom when new messages are added
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
      const response = await fetch('/api/gmail/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input.trim(),
          emails: emails,
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
        emailData: data.email
      }

      setMessages(prev => [...prev, assistantMessage])
      setConversationHistory(prev => [...prev, { role: 'assistant', content: assistantMessage.content }])

      // Handle different actions
      if (data.action === 'send_email' && data.email) {
        await sendEmail(data.email)
      } else if (data.action === 'reply_email' && data.email) {
        await replyEmail(data.email)
      } else if (data.action === 'summarize') {
        // Fetch full email content for summarization
        await summarizeEmails(emails.slice(0, 10)) // Summarize last 10 emails
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

  const sendEmail = async (emailData: any) => {
    try {
      setIsLoading(true)

      // Validate required fields
      if (!emailData.to) {
        throw new Error('Recipient email address is required')
      }

      if (!emailData.subject) {
        throw new Error('Email subject is required')
      }

      if (!emailData.body) {
        throw new Error('Email body is required')
      }

      const response = await fetch('/api/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          to: Array.isArray(emailData.to) ? emailData.to : [emailData.to],
          cc: emailData.cc || [],
          bcc: emailData.bcc || [],
          subject: emailData.subject,
          bodyText: emailData.body,
          bodyHtml: emailData.bodyHtml || emailData.body.replace(/\n/g, '<br>')
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email')
      }

      // Add success message
      const successMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `✅ Email sent successfully to ${Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to}!`,
        timestamp: new Date(),
        action: 'answer',
        emailData: data.message
      }

      setMessages(prev => [...prev, successMessage])
      setConversationHistory(prev => [...prev, { role: 'assistant', content: successMessage.content }])

      // Refresh emails
      if (onEmailSent) {
        onEmailSent()
      }
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `❌ Failed to send email: ${error.message}`,
        timestamp: new Date(),
        action: 'error'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const replyEmail = async (emailData: any) => {
    try {
      setIsLoading(true)

      // Validate required fields
      if (!emailData.replyToMessageId) {
        throw new Error('Email ID to reply to is required')
      }

      if (!emailData.body) {
        throw new Error('Reply content is required')
      }

      // Try to find the original email, but if not found, use the messageId directly
      const originalEmail = emails.find(e => e.id === emailData.replyToMessageId)
      const recipientEmail = originalEmail 
        ? (originalEmail.from.match(/<(.+)>/)?.[1] || originalEmail.from)
        : 'recipient'

      // Use the reply action which handles threading properly
      const response = await fetch('/api/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reply',
          messageId: emailData.replyToMessageId,
          bodyText: emailData.body,
          bodyHtml: emailData.bodyHtml || emailData.body.replace(/\n/g, '<br>')
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reply')
      }

      // Add success message
      const successMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `✅ Reply sent successfully${originalEmail ? ` to ${recipientEmail}` : ''}!`,
        timestamp: new Date(),
        action: 'answer',
        emailData: data.message
      }

      setMessages(prev => [...prev, successMessage])
      setConversationHistory(prev => [...prev, { role: 'assistant', content: successMessage.content }])

      // Refresh emails
      if (onEmailSent) {
        onEmailSent()
      }
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `❌ Failed to send reply: ${error.message}`,
        timestamp: new Date(),
        action: 'error'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const summarizeEmails = async (emailsToSummarize: Email[]) => {
    try {
      setIsLoading(true)

      // Fetch full content for each email
      const emailsWithContent = await Promise.all(
        emailsToSummarize.map(async (email) => {
          try {
            const response = await fetch(`/api/gmail?action=get&messageId=${email.id}`)
            const data = await response.json()
            if (data.success && data.email) {
              return {
                ...email,
                bodyText: data.email.bodyText || email.snippet,
                bodyHtml: data.email.bodyHtml
              }
            }
            return { ...email, bodyText: email.snippet }
          } catch (e) {
            return { ...email, bodyText: email.snippet }
          }
        })
      )

      // Send to AI for summarization
      const response = await fetch('/api/gmail/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Please summarize these ${emailsWithContent.length} emails. Provide a concise summary of the main points, key information, and any action items.`,
          emails: emailsWithContent,
          conversationHistory: conversationHistory
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to summarize emails')
      }

      const summaryMessage: ChatMessage = {
        id: (Date.now() + 3).toString(),
        role: 'assistant',
        content: data.response || 'Summary generated successfully.',
        timestamp: new Date(),
        action: 'summarize'
      }

      setMessages(prev => [...prev, summaryMessage])
      setConversationHistory(prev => [...prev, { role: 'assistant', content: summaryMessage.content }])
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 3).toString(),
        role: 'assistant',
        content: `❌ Failed to summarize emails: ${error.message}`,
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

  const formatEmailPreview = (emailData: any) => {
    if (!emailData) return null

    return (
      <div className="mt-2 p-3 bg-muted rounded-lg border border-primary/20">
        <div className="flex items-start gap-2 mb-2">
          <Mail className="h-4 w-4 text-primary mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <User className="h-3 w-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                To: {Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to}
              </p>
            </div>
            <p className="font-semibold text-sm">{emailData.subject || 'No Subject'}</p>
            {emailData.body && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{emailData.body}</p>
            )}
          </div>
        </div>
        {emailData.cc && emailData.cc.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileText className="h-3 w-3" />
            <span>CC: {emailData.cc.join(', ')}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            AI Gmail Assistant
          </DialogTitle>
          <DialogDescription>
            Ask me to send emails, reply, summarize, or search your inbox
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
                  {message.emailData && formatEmailPreview(message.emailData)}
                  <p className="text-xs opacity-70 mt-1.5">
                    {format(message.timestamp, 'h:mm a')}
                  </p>
                </div>
                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="h-4 w-4 text-primary" />
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
              placeholder="Ask me to send an email, reply, or summarize..."
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
            Try: "Send an email to john@example.com about the meeting" or "Summarize my last 5 emails"
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

