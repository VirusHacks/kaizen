"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mic, MicOff, Send, Copy, Minimize2, MessageCircle, Volume2, VolumeX } from "lucide-react"

export function PopupAssistant() {
  const [messages, setMessages] = useState<Array<{ id: string; role: "user" | "assistant"; content: string }>>([])
  const [input, setInput] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [isSpeechRecognitionSupported, setIsSpeechRecognitionSupported] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isMuted, setIsMuted] = useState(false)

  const recognitionRef = useRef<any>(null)
  // eslint-disable-next-line no-undef
  const synthRef = useRef<SpeechSynthesis | null>(null)
  // eslint-disable-next-line no-undef
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        setIsSpeechRecognitionSupported(true)
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true

        recognitionRef.current.onresult = (event: any) => {
          const finalTranscript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join(" ")
          setTranscript(finalTranscript)
          setInput(finalTranscript)
        }
      }

      if ("speechSynthesis" in window) {
        synthRef.current = window.speechSynthesis
        utteranceRef.current = new SpeechSynthesisUtterance()
      }
    }
  }, [])

  const startListening = () => {
    if (recognitionRef.current) {
      setIsListening(true)
      recognitionRef.current.start()
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      setIsListening(false)
      recognitionRef.current.stop()
    }
  }

  const speakText = useCallback(
    (text: string) => {
      if (synthRef.current && utteranceRef.current && !isMuted) {
        synthRef.current.cancel()
        utteranceRef.current.text = text
        utteranceRef.current.onstart = () => setIsSpeaking(true)
        utteranceRef.current.onend = () => setIsSpeaking(false)
        synthRef.current.speak(utteranceRef.current)
      }
    },
    [isMuted],
  )

  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (isSpeaking) {
      synthRef.current?.cancel()
      setIsSpeaking(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      try {
        const userMessage = { id: Date.now().toString(), role: "user" as const, content: input }
        setMessages((prev) => [...prev, userMessage]) // Add user message to UI

        const response = await fetch("https://virushacks.app.n8n.cloud/webhook/aichat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: input, // Send only the query
          }),
        })

        if (response.ok) {
          const data = await response.json()
          const assistantMessage = { id: Date.now().toString(), role: "assistant" as const, content: data.output }

          setMessages((prev) => [...prev, assistantMessage]) // Add assistant message to UI
          speakText(data.output) // Speak the response
        } else {
          console.error("Error fetching response:", await response.text())
        }

        setInput("")
        setTranscript("")
      } catch (error) {
        console.error("Error sending message:", error)
      }
    }
  }

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === "assistant") {
        speakText(lastMessage.content)
      }
    }
  }, [messages, speakText])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div
      className={`fixed bottom-4 right-4 transition-all duration-300 ease-in-out ${isExpanded ? "w-[50vh] h-[80vh]" : "w-16 h-16"}`}
    >
      {!isExpanded && (
        <Button
          className="w-16 h-16 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => setIsExpanded(true)}
        >
          <MessageCircle className="h-8 w-8" />
        </Button>
      )}
      {isExpanded && (
        <div className="w-full h-full bg-background border border-border rounded-3xl shadow-lg flex flex-col overflow-hidden">
          <div className="p-4 flex justify-between items-center border-b">
            <span className="font-semibold">Assistant</span>
            <Button size="icon" variant="ghost" onClick={() => setIsExpanded(false)}>
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-grow overflow-y-auto p-4 space-y-4">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] p-2 rounded-lg text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
                >
                  {m.content}
                  <Button size="icon" variant="ghost" className="h-4 w-4 ml-1" onClick={() => handleCopy(m.content)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            {transcript && (
              <div className="flex justify-start">
                <span className="max-w-[80%] p-2 rounded-lg bg-yellow-200 text-yellow-900 text-sm">
                  Transcribing: {transcript}
                </span>
              </div>
            )}
          </div>
          {isSpeaking && (
            <div className="text-center text-sm text-muted-foreground animate-pulse">Assistant is speaking...</div>
          )}
          <div className="p-4 border-t">
            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-grow text-sm"
              />
              <Button type="submit" size="icon" className="h-10 w-12">
                <Send className="h-4 w-4" />
              </Button>
              {isSpeechRecognitionSupported && (
                <Button
                  className="h-10 w-12"
                  type="button"
                  size="icon"
                  onClick={isListening ? stopListening : startListening}
                >
                  {isListening ? <MicOff /> : <Mic />}
                </Button>
              )}
              <Button type="button" size="icon" className="h-10 w-12" onClick={toggleMute}>
                {isMuted ? <VolumeX /> : <Volume2 />}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

