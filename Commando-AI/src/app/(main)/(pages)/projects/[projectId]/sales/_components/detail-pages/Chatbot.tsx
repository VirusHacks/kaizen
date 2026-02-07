"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Loader2, Sparkles, AlertCircle, RefreshCw, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatbotProps {
  systemMessage: string;
  contextData?: any;
  pageTitle?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

const QUICK_QUESTIONS = {
  "Revenue Analytics": [
    "What are the main revenue trends?",
    "How can I increase revenue?",
    "Explain the revenue forecast",
    "What's causing the revenue decline?",
  ],
  "Orders Analytics": [
    "What are the order volume trends?",
    "How can I increase order volume?",
    "Explain the orders forecast",
    "What's the relationship between orders and revenue?",
  ],
  "Customer Analytics": [
    "Who are my best customers?",
    "How can I improve customer retention?",
    "Explain the RFM segments",
    "What's my customer lifetime value?",
  ],
  "Lead Generation": [
    "Where should I focus my lead generation efforts?",
    "What channels work best for my business?",
    "How can I find more leads like my best customers?",
    "What's the best time to reach out to prospects?",
  ],
};

export default function Chatbot({ systemMessage, contextData, pageTitle = "Analytics", isOpen = true, onClose }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: `Hello! I'm your ${pageTitle} AI assistant. I can help you understand your data, explain charts, and suggest improvements. What would you like to know?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const quickQuestions = QUICK_QUESTIONS[pageTitle as keyof typeof QUICK_QUESTIONS] || QUICK_QUESTIONS["Revenue Analytics"];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async (retry = false) => {
    const messageToSend = retry ? messages[messages.length - 2]?.content : input;
    if (!messageToSend?.trim() || isTyping) return;

    if (!retry) {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: input,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
    }

    setIsTyping(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemMessage,
          userMessage: messageToSend,
          contextData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if it's an API key error
        if (data.error?.includes("API key") || data.error?.includes("not configured")) {
          throw new Error("AI Assistant is not configured. Please add GOOGLE_AI_API_KEY to your environment variables.");
        }
        throw new Error(data.error || data.details || "Failed to get response");
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message || "I apologize, but I couldn't generate a response. Please try again.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setRetryCount(0);
      setError(null);
    } catch (error: any) {
      console.error("Chat error:", error);
      const errorMsg = error.message || "Unknown error";
      setError(errorMsg);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I apologize, but I encountered an error: ${errorMsg}. ${retryCount < 2 ? "You can try again or check if the AI service is configured." : "Please check your AI API key configuration."}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setRetryCount(prev => prev + 1);
    } finally {
      setIsTyping(false);
    }
  };

  const handleRetry = () => {
    // Remove the last error message and retry
    setMessages((prev) => prev.slice(0, -1));
    handleSend(true);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: "1",
        role: "assistant",
        content: `Hello! I'm your ${pageTitle} AI assistant. I can help you understand your data, explain charts, and suggest improvements. What would you like to know?`,
        timestamp: new Date(),
      },
    ]);
    setError(null);
    setRetryCount(0);
  };

  const handleQuickQuestion = (question: string) => {
    setInput(question);
    // Auto-send after a brief delay
    setTimeout(() => {
      handleSend(false);
    }, 100);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <Card className="h-screen w-[28rem] flex flex-col bg-gradient-to-br from-card to-card/80 border-purple-500/30 backdrop-blur-sm shadow-2xl overflow-hidden rounded-none border-l border-t-0 border-b-0 border-r-0 animate-in slide-in-from-right duration-300">
      <CardHeader className="border-b border-border/50 bg-gradient-to-r from-purple-500/10 to-transparent px-6 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-3">
            <div className="relative p-2 rounded-lg bg-purple-500/20">
              <Bot className="h-5 w-5 text-purple-400" />
              <Sparkles className="h-3 w-3 text-yellow-400 absolute -top-0.5 -right-0.5 animate-pulse" />
            </div>
            <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">Analytics Assistant</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            {messages.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearChat}
                className="h-7 w-7 p-0 hover:bg-purple-500/10"
                title="Clear chat"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-7 w-7 p-0 hover:bg-red-500/10 hover:text-red-400"
                title="Close chatbot"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {error && (
          <div className="mt-2 flex items-center gap-2 text-xs text-red-400">
            <AlertCircle className="h-3 w-3" />
            <span>{error}</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
          <div className="space-y-5">
            {messages.length === 1 && (
              <div className="space-y-3 mb-4">
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Quick questions:</p>
                <div className="flex flex-col gap-2.5">
                  {quickQuestions.map((question, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickQuestion(question)}
                      className="text-left justify-start h-auto py-2.5 px-4 text-xs hover:bg-purple-500/10 hover:border-purple-500/30 transition-all duration-200 hover:scale-[1.02]"
                      disabled={isTyping}
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-purple-600/20 flex items-center justify-center border border-purple-500/30">
                    <Bot className="h-4 w-4 text-purple-400" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-xl p-4 shadow-md ${
                    message.role === "user"
                      ? "bg-gradient-to-br from-purple-500/20 to-purple-600/10 text-foreground border border-purple-500/30"
                      : "bg-muted/80 text-foreground border border-border/50"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  <p className="text-xs text-muted-foreground mt-2.5 font-medium">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {message.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/30 to-blue-600/20 flex items-center justify-center border border-blue-500/30">
                    <User className="h-4 w-4 text-blue-400" />
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-purple-600/20 flex items-center justify-center border border-purple-500/30">
                  <Bot className="h-4 w-4 text-purple-400" />
                </div>
                <div className="bg-muted/80 rounded-lg p-3 border border-border/50">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        {error && retryCount < 3 && (
          <div className="px-4 py-2 border-t border-border/50 bg-red-500/10">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="w-full text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              Retry
            </Button>
          </div>
        )}
        <div className="border-t border-border/50 p-5 bg-gradient-to-t from-background to-transparent">
          <div className="flex gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about your analytics..."
              className="flex-1 bg-background/50 border-purple-500/20 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
              disabled={isTyping}
            />
            <Button
              onClick={() => handleSend(false)}
              disabled={!input.trim() || isTyping}
              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              {isTyping ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          {contextData && (
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5 font-medium">
              <Sparkles className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
              AI has access to your current data
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
