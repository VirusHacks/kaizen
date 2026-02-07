'use client'
import React, { useMemo } from 'react'
import { Lightbulb, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EditorCanvasDefaultCardTypes } from '@/lib/constant'
import { EditorNodeType, EditorCanvasTypes } from '@/lib/types'
import EditorCanvasIconHelper from './editor-canvas-card-icon-hepler'
import { cn } from '@/lib/utils'

type Props = {
  nodes: EditorNodeType[]
  selectedNode: EditorNodeType | null
  onAddSuggestedNode: (nodeType: string) => void
  className?: string
}

// Define intelligent suggestions based on workflow context
const suggestionRules: {
  condition: (nodes: EditorNodeType[], selected: EditorNodeType | null) => boolean
  suggestions: { type: string; reason: string }[]
}[] = [
  // Empty workflow - suggest triggers
  {
    condition: (nodes) => nodes.length === 0,
    suggestions: [
      { type: 'Google Drive', reason: 'Start with file change detection' },
      { type: 'Trigger', reason: 'Create a custom trigger' },
    ],
  },
  // Has Google Drive trigger - suggest actions
  {
    condition: (nodes, selected) => 
      nodes.some(n => n.type === 'Google Drive') && 
      (!selected || selected.type === 'Google Drive'),
    suggestions: [
      { type: 'Discord', reason: 'Notify your Discord channel' },
      { type: 'Slack', reason: 'Send a Slack message' },
      { type: 'AI', reason: 'Process file content with AI' },
      { type: 'Notion', reason: 'Log to Notion database' },
    ],
  },
  // Has AI node selected - suggest output actions
  {
    condition: (nodes, selected) => selected?.type === 'AI',
    suggestions: [
      { type: 'Email', reason: 'Send AI response via email' },
      { type: 'Slack', reason: 'Post AI summary to Slack' },
      { type: 'Discord', reason: 'Share AI output in Discord' },
      { type: 'Notion', reason: 'Save AI analysis to Notion' },
    ],
  },
  // Has Slack or Discord - suggest more integrations
  {
    condition: (nodes, selected) => 
      (['Slack', 'Discord'] as string[]).includes(selected?.type || ''),
    suggestions: [
      { type: 'Wait', reason: 'Add a delay before next action' },
      { type: 'Condition', reason: 'Add conditional logic' },
      { type: 'Email', reason: 'Also send an email' },
    ],
  },
  // Has Notion - suggest completion actions
  {
    condition: (nodes, selected) => selected?.type === 'Notion',
    suggestions: [
      { type: 'Slack', reason: 'Notify team after Notion update' },
      { type: 'Email', reason: 'Send confirmation email' },
      { type: 'Google Calendar', reason: 'Create a calendar event' },
    ],
  },
  // General workflow with trigger - suggest enhancements
  {
    condition: (nodes) => 
      nodes.length > 0 && 
      nodes.some(n => EditorCanvasDefaultCardTypes[n.type as keyof typeof EditorCanvasDefaultCardTypes]?.type === 'Trigger'),
    suggestions: [
      { type: 'Wait', reason: 'Add timing control' },
      { type: 'Condition', reason: 'Branch your workflow' },
      { type: 'AI', reason: 'Add intelligence to your flow' },
    ],
  },
]

const SmartSuggestions = ({ nodes, selectedNode, onAddSuggestedNode, className }: Props) => {
  // Find matching suggestions based on current context
  const suggestions = useMemo(() => {
    for (const rule of suggestionRules) {
      if (rule.condition(nodes, selectedNode)) {
        // Filter out suggestions for nodes that already exist (except for certain types)
        return rule.suggestions.filter(s => {
          // Always show if it's a different type than existing
          const existingOfType = nodes.filter(n => n.type === s.type)
          // Allow multiple of same type except for triggers
          if (s.type === 'Google Drive' || s.type === 'Trigger') {
            return existingOfType.length === 0
          }
          return true
        }).slice(0, 3) // Show max 3 suggestions
      }
    }
    return []
  }, [nodes, selectedNode])

  if (suggestions.length === 0) return null

  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium">
            Suggested next steps
          </span>
        </div>
        <div className="space-y-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.type}
              onClick={() => onAddSuggestedNode(suggestion.type)}
              className="w-full flex items-center gap-2 p-2 rounded-md bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
            >
              <EditorCanvasIconHelper type={suggestion.type as EditorCanvasTypes} />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">{suggestion.type}</p>
                <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default SmartSuggestions
