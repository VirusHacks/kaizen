"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { MessageCircle, SendHorizontal, X, MinimizeIcon, MaximizeIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "assistant" | "user"
  content: string
  timestamp: number
}

const fadeIn = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
}

const popIn = {
  initial: { scale: 0.95, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    scale: 0.95,
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
}

export default function MeetingChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: input,
          meetingId: "default-meeting",
        }),
      })

      if (!response.ok) throw new Error("Failed to fetch response")

      const data = await response.json()

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.answer,
          timestamp: Date.now(),
        },
      ])
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence mode="wait">
          {!isOpen ? (
            <motion.div initial="initial" animate="animate" exit="exit" variants={popIn}>
              <Button
                variant="default"
                size="lg"
                className="rounded-full px-6 py-6 shadow-lg hover:shadow-xl transition-all duration-200 bg-white"
                onClick={() => setIsOpen(true)}
              >
                <MessageCircle className="h-6 w-6 mr-2" />
                <span className="text-base">Chat</span>
              </Button>
            </motion.div>
          ) : (
            <motion.div
              initial="initial"
              animate="animate"
              exit="exit"
              variants={popIn}
              className="w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="w-[450px] overflow-hidden shadow-2xl bg-background border-primary/20">
                {/* Enhanced Chat Header */}
                <motion.div
                  className="flex items-center justify-between p-4 border-b bg-primary/5"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h2 className="font-semibold flex items-center gap-3 text-base">
                    <MessageCircle className="w-5 h-5 text-primary" />
                    <span>Meeting Chat</span>
                  </h2>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-primary/10 transition-colors"
                      onClick={() => setIsMinimized(!isMinimized)}
                    >
                      {isMinimized ? <MaximizeIcon className="h-4 w-4" /> : <MinimizeIcon className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>

                <AnimatePresence mode="wait">
                  {!isMinimized && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{
                        height: "auto",
                        opacity: 1,
                        transition: {
                          height: { duration: 0.3 },
                          opacity: { duration: 0.2, delay: 0.1 },
                        },
                      }}
                      exit={{
                        height: 0,
                        opacity: 0,
                        transition: {
                          height: { duration: 0.3 },
                          opacity: { duration: 0.2 },
                        },
                      }}
                    >
                      {/* Enhanced Chat Messages */}
                      <ScrollArea className="h-[500px] p-4">
                        <motion.div
                          className="space-y-4"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          {messages.map((message, index) => (
                            <motion.div
                              key={message.id}
                              variants={fadeIn}
                              initial="initial"
                              animate="animate"
                              exit="exit"
                              transition={{ delay: index * 0.1 }}
                              className={cn(
                                "flex gap-3 text-sm",
                                message.role === "assistant" ? "flex-row" : "flex-row-reverse",
                              )}
                            >
                              <Avatar className="h-9 w-9 border shadow-sm">
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {message.role === "assistant" ? "AI" : "ME"}
                                </AvatarFallback>
                              </Avatar>
                              <div
                                className={cn(
                                  "rounded-2xl px-4 py-2.5 max-w-[75%] text-sm leading-relaxed shadow-sm",
                                  message.role === "assistant"
                                    ? "bg-muted/50 text-foreground"
                                    : "bg-primary text-primary-foreground",
                                )}
                              >
                                {message.content}
                              </div>
                            </motion.div>
                          ))}
                          {isLoading && (
                            <motion.div
                              className="flex gap-3"
                              variants={fadeIn}
                              initial="initial"
                              animate="animate"
                              exit="exit"
                            >
                              <Avatar className="h-9 w-9 border shadow-sm">
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">AI</AvatarFallback>
                              </Avatar>
                              <div className="bg-muted/50 text-muted-foreground rounded-2xl px-4 py-2.5 text-sm flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Thinking...
                              </div>
                            </motion.div>
                          )}
                        </motion.div>
                      </ScrollArea>

                      {/* Enhanced Chat Input */}
                      <motion.div
                        className="p-4 border-t bg-background/95"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <form onSubmit={handleSubmit} className="flex gap-2">
                          <Input
                            placeholder="Type your message..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isLoading}
                            className="flex-1 bg-muted/50 text-base py-5 px-4"
                          />
                          <Button
                            type="submit"
                            size="icon"
                            disabled={isLoading}
                            className={cn(
                              "h-12 w-12 rounded-full transition-all duration-200",
                              input.trim() ? "bg-primary hover:bg-primary/40 scale-100" : "bg-muted scale-95",
                            )}
                          >
                            <SendHorizontal className="h-5 w-5" />
                          </Button>
                        </form>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

