"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"

interface TranscriptionDisplayProps {
  isRecording: boolean
  isProcessing: boolean
  transcriptionText: string
}

export function TranscriptionDisplay({ isRecording, isProcessing, transcriptionText }: TranscriptionDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto scroll to bottom when new text is added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcriptionText])

  if (!isRecording) return null

  return (
    <Card className="absolute bottom-20 left-0 right-0 mx-auto max-w-4xl bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={cn("h-2 w-2 rounded-full animate-pulse", isProcessing ? "bg-yellow-500" : "bg-red-500")} />
          <span className="text-sm font-medium text-white">{isProcessing ? "Processing..." : "Transcribing..."}</span>
        </div>
        <span className="text-xs text-white/70">{new Date().toLocaleTimeString()}</span>
      </div>
      <ScrollArea className="h-[200px] w-full rounded-md border border-white/10">
        <div ref={scrollRef} className="space-y-2 p-4 text-white">
          {transcriptionText.split(/[.!?]+/).map((sentence, index) => {
            if (!sentence.trim()) return null
            return (
              <p key={index} className="leading-relaxed">
                {sentence.trim() + "."}
              </p>
            )
          })}
          {!transcriptionText && <p className="text-white/50 italic">Waiting for speech...</p>}
        </div>
      </ScrollArea>
    </Card>
  )
}

