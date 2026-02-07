"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Bot, AlertCircle } from "lucide-react";

// Statically assign environment variables at build time
const apiKey = process.env.NEXT_PUBLIC_TAVUS_API_KEY;
const replicaId = process.env.NEXT_PUBLIC_TAVUS_REPLICA_ID;
const personaId = process.env.NEXT_PUBLIC_TAVUS_PERSONA_ID;

interface ContextData {
  personaId: string;
  personaName: string;
  websiteUrl: string;
  createdAt: string;
  contextSize: number;
  pagesIncluded: number;
  knowledgeBase: string;
  scrapedContent: string;
}

export default function TavusChatbot() {
  const [conversationUrl, setConversationUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [, setContextData] = useState<ContextData | null>(null);

  // Start Tavus conversation on mount
  useEffect(() => {
    startConversation();
  }, []);

  const startConversation = async () => {
    setLoading(true);
    setError("");

    try {
      console.log("🔧 Starting Tavus conversation...");

      if (!apiKey || !replicaId) {
        throw new Error(
          "Missing Tavus configuration. Please check your environment variables."
        );
      }

      let conversationalContext =
        "You are a helpful AI sales assistant for a CRM platform. You help sales employees understand their performance metrics, customer insights, and provide strategic guidance to improve their sales outcomes.";

      try {
        const contextResponse = await fetch(
          "/tavus-context/current-context.json"
        );
        if (contextResponse.ok) {
          const data = await contextResponse.json();
          setContextData(data);

          if (data.knowledgeBase) {
            conversationalContext = `You are an AI sales assistant integrated into a professional CRM platform. 
            
You help sales employees by providing:
- Performance insights and analytics guidance
- Customer relationship strategies
- Sales pipeline optimization tips
- Data-driven recommendations

${data.knowledgeBase}

${data.scrapedContent || ""}

Always be professional, concise, and action-oriented. Focus on helping sales employees achieve their goals.`;
          }
        }
      } catch {
        console.log("Using default CRM sales context");
      }

      const requestBody: Record<string, unknown> = {
        replica_id: replicaId,
        conversation_name: "Sales AI Assistant",
        conversational_context: conversationalContext,
        custom_greeting:
          "Hello! I'm your AI sales assistant. I'm here to help you understand your performance, provide insights on your customers, and guide you toward better sales outcomes. How can I assist you today?",
        properties: {
          enable_recording: false,
          enable_closed_captions: true,
        },
      };

      if (personaId) {
        requestBody.persona_id = personaId;
      }

      const response = await fetch("https://tavusapi.com/v2/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify(requestBody),
      });
      // Debug: log minimal request info (do NOT log apiKey)
      console.log(
        "Tavus request: replicaId=",
        replicaId,
        "personaId=",
        personaId ?? "(none)"
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "Tavus API responded with status",
          response.status,
          "body:",
          errorText
        );

        // Build a helpful error message for UI display
        let errorMessage = `Tavus API ${response.status}: ${
          errorText || "Unexpected response"
        }`;
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.message?.includes("maximum concurrent conversations")) {
            errorMessage =
              "Another conversation is active. Please wait a moment and try again.";
          } else if (errorData.message) {
            errorMessage = `Tavus API ${response.status}: ${errorData.message}`;
          }
        } catch {
          // leave errorMessage as-is when parsing fails
        }

        // Surface the error to the UI instead of throwing, so the user sees the API body
        setError(errorMessage);
        setLoading(false);
        return;
      }

      const data = await response.json();
      setConversationUrl(data.conversation_url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start conversation"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-black space-y-8 pb-12">
      {/* Minimal Header */}
      <div className="relative">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <Bot className="h-8 w-8 text-purple-400" />
          AI Sales Assistant
        </h1>
        <p className="text-gray-400 text-sm">
          Talk to your sales data and get AI-powered insights in real-time
        </p>
      </div>

      {/* Main Assistant Card */}
      <Card className="bg-[#0a0a0a] border border-gray-800">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <Bot className="h-4 w-4 text-purple-400" />
              Meet Your AI Assistant
            </CardTitle>
            <CardDescription className="text-gray-400 text-sm">
              Your 24/7 assistant to all things Sales
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {/* Video/Content Area */}
            <div className="relative bg-black overflow-hidden" style={{ minHeight: "600px" }}>
              {/* Grid Background Effect */}
              <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                  backgroundImage:
                    "linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              />

              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                  <Loader2 className="h-12 w-12 animate-spin text-purple-400 mb-4" />
                  <p className="text-gray-400 text-sm uppercase tracking-wider">
                    Connecting to AI Assistant...
                  </p>
                </div>
              )}

              {error && (
                <div className="absolute inset-0 flex items-center justify-center z-20 p-12">
                  <Card className="bg-[#0a0a0a] border border-gray-800 max-w-md">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <AlertCircle className="h-5 w-5 text-red-400" />
                        <p className="text-red-400 font-medium">Connection Error</p>
                      </div>
                      <p className="text-gray-400 text-sm mb-6">{error}</p>
                      <Button
                        onClick={startConversation}
                        className="w-full bg-[#0a0a0a] border-gray-700 text-white hover:bg-gray-900 hover:border-purple-500/50"
                      >
                        Retry Connection
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Tavus Iframe */}
              {conversationUrl && !loading && !error && (
                <iframe
                  src={conversationUrl}
                  className="absolute inset-0 w-full h-full"
                  allow="camera; microphone; display-capture"
                />
              )}

              {/* Gradient Overlay */}
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black to-transparent pointer-events-none" />
            </div>

            {/* Status Footer */}
            {conversationUrl && !loading && !error && (
              <div className="h-12 border-t border-gray-800 bg-[#0a0a0a] flex items-center px-6 justify-between">
                <div className="flex items-center gap-6 text-xs text-gray-400">
                  <span>Status: Connected</span>
                  <span>Voice: Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs font-medium text-green-400">
                    Online
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
}