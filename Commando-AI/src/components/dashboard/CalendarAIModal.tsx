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
import { Bot, Send, Loader2, Calendar, Clock, MapPin, Users, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'

interface CalendarEvent {
  id: string
  summary: string
  description: string
  start: string
  end: string
  location: string
  htmlLink: string
  attendees: Array<{ email: string; displayName?: string }>
  isAllDay: boolean
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  action?: 'create_event' | 'answer' | 'read_events' | 'error'
  eventData?: any
}

interface CalendarAIModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  events: CalendarEvent[]
  onEventCreated?: () => void
}

export function CalendarAIModal({ open, onOpenChange, events, onEventCreated }: CalendarAIModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your AI calendar assistant. I can help you:\n\n• Create events (e.g., 'Schedule a meeting tomorrow at 2pm')\n• Check your calendar (e.g., 'What do I have this week?')\n• Find free time (e.g., 'When am I free next week?')\n• Answer questions about your schedule\n\nWhat would you like to do?",
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
      const response = await fetch('/api/calendar/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input.trim(),
          events: events,
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
        eventData: data.event
      }

      setMessages(prev => [...prev, assistantMessage])
      setConversationHistory(prev => [...prev, { role: 'assistant', content: assistantMessage.content }])

      // If AI wants to create an event, show confirmation and create it
      if (data.action === 'create_event' && data.event) {
        await createEvent(data.event)
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

  const createEvent = async (eventData: any) => {
    try {
      setIsLoading(true)

      // Validate required fields
      if (!eventData.summary) {
        throw new Error('Event title is required')
      }

      if (!eventData.startDateTime || !eventData.endDateTime) {
        throw new Error('Start and end times are required')
      }

      // Validate dates
      const startDate = new Date(eventData.startDateTime)
      const endDate = new Date(eventData.endDateTime)

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date format')
      }

      if (endDate <= startDate) {
        throw new Error('End time must be after start time')
      }

      const response = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: eventData.summary || 'Untitled Event',
          description: eventData.description || '',
          startDateTime: eventData.startDateTime,
          endDateTime: eventData.endDateTime,
          location: eventData.location || '',
          attendees: eventData.attendees || [],
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create event')
      }

      // Add success message
      const successMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `✅ Event created successfully! "${eventData.summary}" has been added to your calendar.`,
        timestamp: new Date(),
        action: 'answer',
        eventData: data.event
      }

      setMessages(prev => [...prev, successMessage])
      setConversationHistory(prev => [...prev, { role: 'assistant', content: successMessage.content }])

      // Refresh calendar
      if (onEventCreated) {
        onEventCreated()
      }
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `❌ Failed to create event: ${error.message}`,
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

  const formatEventPreview = (eventData: any) => {
    if (!eventData) return null

    const startDate = eventData.startDateTime ? parseISO(eventData.startDateTime) : null
    const endDate = eventData.endDateTime ? parseISO(eventData.endDateTime) : null

    return (
      <div className="mt-2 p-3 bg-muted rounded-lg border border-primary/20">
        <div className="flex items-start gap-2 mb-2">
          <Calendar className="h-4 w-4 text-primary mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">{eventData.summary || 'Untitled Event'}</p>
            {eventData.description && (
              <p className="text-xs text-muted-foreground mt-1">{eventData.description}</p>
            )}
          </div>
        </div>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          {startDate && endDate && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              <span>
                {format(startDate, 'MMM d, yyyy h:mm a')} - {format(endDate, 'h:mm a')}
              </span>
            </div>
          )}
          {eventData.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3" />
              <span>{eventData.location}</span>
            </div>
          )}
          {eventData.attendees && eventData.attendees.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Users className="h-3 w-3" />
              <span>{eventData.attendees.length} attendee{eventData.attendees.length > 1 ? 's' : ''}</span>
            </div>
          )}
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
            AI Calendar Assistant
          </DialogTitle>
          <DialogDescription>
            Ask me to create events, check your schedule, or find free time
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
                  {message.eventData && formatEventPreview(message.eventData)}
                  <p className="text-xs opacity-70 mt-1.5">
                    {format(message.timestamp, 'h:mm a')}
                  </p>
                </div>
                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-primary" />
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
              placeholder="Ask me anything about your calendar..."
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
            Try: "Schedule a meeting tomorrow at 2pm" or "What do I have this week?"
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

