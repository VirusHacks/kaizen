'use client'

import { useState, useCallback } from 'react'
import { v4 } from 'uuid'
import { Sparkles, Wand2, Loader2, Check, RefreshCw, Lightbulb, ArrowRight, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { EditorCanvasTypes, EditorNodeType } from '@/lib/types'
import { EditorCanvasDefaultCardTypes } from '@/lib/constant'
import EditorCanvasIconHelper from './editor-canvas-card-icon-hepler'

interface AIWorkflowGeneratorProps {
  onApplyWorkflow: (workflow: { nodes: EditorNodeType[]; edges: any[] }) => void
  existingNodes?: EditorNodeType[]
}

interface GeneratedNode {
  type: string
  title: string
  description: string
  position: { x: number; y: number }
}

interface GeneratedWorkflow {
  name: string
  description: string
  nodes: GeneratedNode[]
  edges: { sourceIndex: number; targetIndex: number }[]
  suggestions: string[]
}

const EXAMPLE_PROMPTS = [
  "When a new file is added to Google Drive, summarize it with AI and post to Slack",
  "Send a Discord notification when a Google Calendar event starts",
  "When triggered, send an email and create a Notion page with the details",
  "Monitor Google Drive for changes, use AI to analyze, then notify via Discord and Slack",
]

export default function AIWorkflowGenerator({ onApplyWorkflow, existingNodes = [] }: AIWorkflowGeneratorProps) {
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedWorkflow, setGeneratedWorkflow] = useState<GeneratedWorkflow | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Please describe your workflow')
      return
    }

    setIsGenerating(true)
    setError(null)
    setGeneratedWorkflow(null)

    try {
      const response = await fetch('/api/generate-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate workflow')
      }

      setGeneratedWorkflow(data.workflow)
      toast.success('Workflow generated!')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate workflow'
      setError(message)
      toast.error(message)
    } finally {
      setIsGenerating(false)
    }
  }, [prompt])

  const handleApply = useCallback(() => {
    if (!generatedWorkflow) return

    // Check if there's already a trigger in existing nodes
    const existingTrigger = existingNodes.some(
      node => EditorCanvasDefaultCardTypes[node.type as keyof typeof EditorCanvasDefaultCardTypes]?.type === 'Trigger'
    )

    // Convert generated workflow to EditorNodeType format
    const nodeIdMap: Record<number, string> = {}
    
    const nodes: EditorNodeType[] = generatedWorkflow.nodes.map((node, index) => {
      const nodeId = v4()
      nodeIdMap[index] = nodeId

      // Skip trigger if one already exists
      const nodeTypeInfo = EditorCanvasDefaultCardTypes[node.type as keyof typeof EditorCanvasDefaultCardTypes]
      if (existingTrigger && nodeTypeInfo?.type === 'Trigger') {
        return null
      }

      return {
        id: nodeId,
        type: node.type as EditorCanvasTypes,
        position: node.position,
        data: {
          title: node.title,
          description: node.description,
          completed: false,
          current: false,
          metadata: {},
          type: node.type as EditorCanvasTypes,
        },
      }
    }).filter(Boolean) as EditorNodeType[]

    // Convert edges using the ID map
    const edges = generatedWorkflow.edges
      .filter(edge => nodeIdMap[edge.sourceIndex] && nodeIdMap[edge.targetIndex])
      .map(edge => ({
        id: v4(),
        source: nodeIdMap[edge.sourceIndex],
        target: nodeIdMap[edge.targetIndex],
      }))

    onApplyWorkflow({ nodes, edges })
    toast.success(`Workflow "${generatedWorkflow.name}" applied!`)
    
    // Reset state
    setOpen(false)
    setPrompt('')
    setGeneratedWorkflow(null)
  }, [generatedWorkflow, existingNodes, onApplyWorkflow])

  const handleClose = () => {
    setOpen(false)
    setPrompt('')
    setGeneratedWorkflow(null)
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose()
      else setOpen(true)
    }}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300"
        >
          <Sparkles className="size-4" />
          AI Generate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl border-neutral-800 bg-neutral-950">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Wand2 className="size-5 text-purple-400" />
            AI Workflow Generator
          </DialogTitle>
          <DialogDescription>
            Describe your automation in plain English and let AI create the workflow for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Input Section */}
          {!generatedWorkflow && (
            <>
              <div className="space-y-2">
                <Textarea
                  placeholder="e.g., When a new file is added to Google Drive, summarize it with AI and post the summary to Slack..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[100px] resize-none border-neutral-800 bg-neutral-900 placeholder:text-neutral-500"
                  disabled={isGenerating}
                />
              </div>

              {/* Example Prompts */}
              <div className="space-y-2">
                <p className="text-xs text-neutral-500">Try an example:</p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_PROMPTS.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => setPrompt(example)}
                      className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs text-neutral-400 transition-colors hover:border-neutral-700 hover:text-neutral-300"
                      disabled={isGenerating}
                    >
                      {example.length > 50 ? example.slice(0, 50) + '...' : example}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full gap-2 bg-purple-600 hover:bg-purple-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Generate Workflow
                  </>
                )}
              </Button>
            </>
          )}

          {/* Preview Section */}
          {generatedWorkflow && (
            <div className="space-y-4">
              {/* Workflow Info */}
              <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
                <h3 className="font-semibold text-neutral-200">{generatedWorkflow.name}</h3>
                <p className="mt-1 text-sm text-neutral-400">{generatedWorkflow.description}</p>
              </div>

              {/* Nodes Preview */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-neutral-300">Workflow Steps:</p>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2 pr-4">
                    {generatedWorkflow.nodes.map((node, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/50 p-3 flex-1">
                          <div className="shrink-0">
                            <EditorCanvasIconHelper type={node.type as EditorCanvasTypes} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-neutral-200">{node.title}</span>
                              <Badge variant="secondary" className="text-xs">
                                {node.type}
                              </Badge>
                            </div>
                            <p className="truncate text-xs text-neutral-500">{node.description}</p>
                          </div>
                        </div>
                        {index < generatedWorkflow.nodes.length - 1 && (
                          <ArrowRight className="size-4 shrink-0 text-neutral-600" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Suggestions */}
              {generatedWorkflow.suggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="flex items-center gap-2 text-sm font-medium text-neutral-300">
                    <Lightbulb className="size-4 text-yellow-500" />
                    AI Suggestions
                  </p>
                  <div className="space-y-1">
                    {generatedWorkflow.suggestions.map((suggestion, index) => (
                      <p key={index} className="text-xs text-neutral-500">
                        • {suggestion}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setGeneratedWorkflow(null)
                    setError(null)
                  }}
                  variant="outline"
                  className="flex-1 gap-2 border-neutral-700"
                >
                  <RefreshCw className="size-4" />
                  Regenerate
                </Button>
                <Button
                  onClick={handleApply}
                  className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Check className="size-4" />
                  Apply to Canvas
                </Button>
              </div>

              {existingNodes.length > 0 && (
                <p className="text-center text-xs text-neutral-500">
                  Note: This will replace your current workflow
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
