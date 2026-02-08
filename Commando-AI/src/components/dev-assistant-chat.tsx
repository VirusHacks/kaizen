'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  Bot,
  X,
  Send,
  Loader2,
  Code2,
  Minimize2,
  Maximize2,
  RotateCcw,
  Wrench,
  Mic,
  MicOff,
  Volume2,
  AlertCircle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolsUsed?: boolean
  timestamp: Date
  isError?: boolean
}

type Props = {
  projectId: string
  projectName: string
}

const MIN_REQUEST_INTERVAL = 1500
const MAX_MESSAGES_IN_SESSION = 50

const SUGGESTED_PROMPTS = [
  'Show me my assigned tasks',
  'What are the high priority issues?',
  'Show recent commits',
  'Generate an implementation plan for my current task',
  'What GitHub issues are open?',
  'What should I work on next?',
]

export default function DevAssistantChat({ projectId, projectName }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [lastRequestTime, setLastRequestTime] = useState(0)
  const [rateLimitError, setRateLimitError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (rateLimitError) {
      const timer = setTimeout(() => setRateLimitError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [rateLimitError])

  const sendMessage = useCallback(
    async (content: string, fromVoice = false) => {
      if (!content.trim() || isLoading) return

      const now = Date.now()
      if (now - lastRequestTime < MIN_REQUEST_INTERVAL) {
        setRateLimitError('Please wait a moment before sending another message.')
        return
      }

      if (messages.length >= MAX_MESSAGES_IN_SESSION) {
        setRateLimitError('Session limit reached. Please clear the chat to continue.')
        return
      }

      if (content.length > 2000) {
        setRateLimitError('Message is too long. Please keep it under 2000 characters.')
        return
      }

      setLastRequestTime(now)
      setRateLimitError(null)

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMessage])
      setInput('')
      setIsLoading(true)

      try {
        const apiMessages = [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        }))

        const res = await fetch('/api/ai/dev-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            messages: apiMessages,
          }),
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: res.statusText }))

          if (res.status === 429) {
            throw new Error('Rate limit exceeded. Please wait a moment before trying again.')
          } else if (res.status === 400) {
            throw new Error(errorData.error || 'Invalid request. Please rephrase your message.')
          } else if (res.status === 401) {
            throw new Error('Session expired. Please refresh the page.')
          } else {
            throw new Error(errorData.error || 'Something went wrong. Please try again.')
          }
        }

        const data = await res.json()

        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.message,
          toolsUsed: data.toolsUsed,
          timestamp: new Date(),
        }

        setMessages((prev) => [...prev, assistantMessage])

        if (fromVoice) {
          await speakText(data.message)
        }
      } catch (error) {
        const errorContent =
          error instanceof Error ? error.message : 'Sorry, something went wrong. Please try again.'
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: errorContent,
          timestamp: new Date(),
          isError: true,
        }
        setMessages((prev) => [...prev, errorMessage])

        if (fromVoice) {
          await speakText(errorContent)
        }
      } finally {
        setIsLoading(false)
      }
    },
    [isLoading, messages, projectId, lastRequestTime],
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const clearChat = () => {
    setMessages([])
    setRateLimitError(null)
    setLastRequestTime(0)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
  }

  const speakText = async (text: string) => {
    try {
      setIsSpeaking(true)
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) throw new Error('Text-to-speech failed')

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.onended = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
      }
      audio.onerror = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
      }

      await audio.play()
    } catch {
      setIsSpeaking(false)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        stream.getTracks().forEach((track) => track.stop())
        await transcribeAudio(audioBlob)
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch {
      alert('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true)
    try {
      const formData = new FormData()
      formData.append('file', audioBlob, 'audio.wav')

      const response = await fetch('/api/whisper', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Transcription failed')

      const data = await response.json()
      const transcribedText = data.text || ''

      if (transcribedText.trim()) {
        await sendMessage(transcribedText, true)
      }
    } catch {
      alert('Failed to transcribe audio. Please try again.')
    } finally {
      setIsTranscribing(false)
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              className="h-14 w-14 rounded-full shadow-lg bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
              size="icon"
            >
              <Code2 className="h-6 w-6 text-white" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'fixed z-50 flex flex-col bg-background border rounded-2xl shadow-2xl overflow-hidden',
              isExpanded
                ? 'bottom-4 right-4 left-4 top-4 md:left-[20%] md:top-[5%] md:bottom-[5%] md:right-[5%]'
                : 'bottom-6 right-6 w-[420px] h-[600px] max-h-[80vh]',
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-emerald-500/5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
                  <Bot className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Dev Assistant</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {projectName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={clearChat}
                  title="Clear chat"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={isExpanded ? 'Minimize' : 'Expand'}
                >
                  {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setIsOpen(false)
                    setIsExpanded(false)
                  }}
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-8 space-y-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
                    <Code2 className="h-8 w-8 text-emerald-600" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="font-semibold text-lg">Dev Assistant</h3>
                    <p className="text-sm text-muted-foreground max-w-[280px]">
                      I can help you understand tasks, analyze commits, review GitHub
                      issues, and plan implementations.
                    </p>
                  </div>
                  <div className="grid gap-2 w-full">
                    {SUGGESTED_PROMPTS.slice(0, 4).map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(prompt)}
                        className="text-left text-sm px-3 py-2 rounded-lg border hover:bg-accent hover:border-emerald-500/30 transition-colors text-muted-foreground hover:text-foreground"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex gap-3',
                        msg.role === 'user' ? 'justify-end' : 'justify-start',
                      )}
                    >
                      {msg.role === 'assistant' && (
                        <div
                          className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                            msg.isError ? 'bg-red-500/20' : 'bg-emerald-500/20',
                          )}
                        >
                          {msg.isError ? (
                            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                          ) : (
                            <Bot className="h-3.5 w-3.5 text-emerald-600" />
                          )}
                        </div>
                      )}
                      <div
                        className={cn(
                          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
                          msg.role === 'user'
                            ? 'bg-emerald-600 text-white rounded-br-md'
                            : msg.isError
                              ? 'bg-red-500/10 border border-red-500/20 rounded-bl-md'
                              : 'bg-muted rounded-bl-md',
                        )}
                      >
                        {msg.role === 'assistant' ? (
                          <div className="space-y-2">
                            {msg.toolsUsed && !msg.isError && (
                              <div className="flex items-center gap-1 text-xs text-emerald-600/70 mb-1">
                                <Wrench className="h-3 w-3" />
                                <span>Fetched project data</span>
                              </div>
                            )}
                            <div
                              className={cn(
                                'prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-pre:bg-background/50 prose-pre:border max-w-none',
                                msg.isError && 'text-red-600 dark:text-red-400',
                              )}
                              dangerouslySetInnerHTML={{
                                __html: formatMarkdown(msg.content),
                              }}
                            />
                          </div>
                        ) : (
                          <p className="leading-relaxed">{msg.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20">
                        <Bot className="h-3.5 w-3.5 text-emerald-600" />
                      </div>
                      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Analyzing...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="border-t p-3 bg-background">
              {rateLimitError && (
                <div className="mb-2 flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-amber-600 dark:text-amber-400">
                    {rateLimitError}
                  </span>
                </div>
              )}
              {isRecording && (
                <div className="mb-2 flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                      Recording...
                    </span>
                  </div>
                </div>
              )}
              {isTranscribing && (
                <div className="mb-2 flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-sm text-blue-600 dark:text-blue-400">
                    Transcribing audio...
                  </span>
                </div>
              )}
              {isSpeaking && (
                <div className="mb-2 flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <Volume2 className="h-4 w-4 text-green-600 animate-pulse" />
                  <span className="text-sm text-green-600 dark:text-green-400">
                    Assistant is speaking...
                  </span>
                </div>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about tasks, commits, issues..."
                  className="flex-1 resize-none rounded-xl border bg-muted/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 max-h-[120px] min-h-[42px]"
                  rows={1}
                  disabled={isLoading || isRecording || isTranscribing || isSpeaking}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement
                    target.style.height = 'auto'
                    target.style.height = `${Math.min(target.scrollHeight, 120)}px`
                  }}
                />
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isLoading || isTranscribing || isSpeaking}
                  size="icon"
                  variant={isRecording ? 'destructive' : 'outline'}
                  className="h-[42px] w-[42px] rounded-xl shrink-0"
                  title={isRecording ? 'Stop recording' : 'Start voice input'}
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Button
                  onClick={() => sendMessage(input, false)}
                  disabled={!input.trim() || isLoading || isRecording || isTranscribing || isSpeaking}
                  size="icon"
                  className="h-[42px] w-[42px] rounded-xl shrink-0 bg-emerald-600 hover:bg-emerald-700"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function formatMarkdown(text: string): string {
  return text
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*<\/li>)/g, '<ul>$1</ul>')
    .replace(/<\/ul>\s*<ul>/g, '')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
}
