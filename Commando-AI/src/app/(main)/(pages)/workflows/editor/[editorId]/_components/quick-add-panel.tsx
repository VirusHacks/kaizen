'use client'
import React, { useState, useCallback } from 'react'
import { Plus, ChevronRight, Zap, Bell, FileText, Bot, Clock, Mail, Webhook } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { EditorCanvasDefaultCardTypes } from '@/lib/constant'
import { EditorCanvasTypes, EditorNodeType } from '@/lib/types'
import EditorCanvasIconHelper from './editor-canvas-card-icon-hepler'
import { cn } from '@/lib/utils'
import { v4 } from 'uuid'

type Props = {
  nodes: EditorNodeType[]
  onAddNode: (nodeType: string, autoConnect?: boolean) => void
  className?: string
}

// Node type to icon mapping for quick visual identification
const quickAddCategories = [
  {
    name: 'Start Here',
    description: 'Begin your workflow',
    items: ['Google Drive', 'Trigger'],
    showWhen: 'no-trigger',
  },
  {
    name: 'Send Notifications',
    description: 'Notify your team',
    items: ['Discord', 'Slack', 'Email'],
    showWhen: 'has-trigger',
  },
  {
    name: 'Process Data',
    description: 'Transform and analyze',
    items: ['AI', 'Condition', 'Notion'],
    showWhen: 'has-trigger',
  },
  {
    name: 'Timing & Webhooks',
    description: 'Control flow',
    items: ['Wait', 'Custom Webhook', 'Google Calendar'],
    showWhen: 'has-trigger',
  },
]

const QuickAddPanel = ({ nodes, onAddNode, className }: Props) => {
  const [open, setOpen] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const hasTrigger = nodes.some(
    (node) => 
      EditorCanvasDefaultCardTypes[node.type as keyof typeof EditorCanvasDefaultCardTypes]?.type === 'Trigger'
  )

  const filteredCategories = quickAddCategories.filter((cat) => {
    if (cat.showWhen === 'no-trigger') return !hasTrigger
    if (cat.showWhen === 'has-trigger') return hasTrigger
    return true
  })

  const handleAddNode = useCallback((nodeType: string) => {
    onAddNode(nodeType, true) // true = auto-connect
    setOpen(false)
  }, [onAddNode])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('gap-2', className)}
        >
          <Plus className="h-4 w-4" />
          Add Node
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-72 p-0" 
        align="start"
        sideOffset={8}
      >
        <div className="p-3 border-b">
          <h3 className="font-semibold text-sm">Quick Add</h3>
          <p className="text-xs text-muted-foreground">
            Click to add a node
          </p>
        </div>
        
        <div className="max-h-[400px] overflow-y-auto">
          {filteredCategories.map((category) => (
            <div key={category.name} className="p-2">
              <div className="px-2 py-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {category.name}
                </p>
              </div>
              <div className="space-y-1">
                {category.items.map((item) => {
                  const cardType = EditorCanvasDefaultCardTypes[item as keyof typeof EditorCanvasDefaultCardTypes]
                  if (!cardType) return null
                  
                  return (
                    <button
                      key={item}
                      onClick={() => handleAddNode(item)}
                      onMouseEnter={() => setHoveredItem(item)}
                      onMouseLeave={() => setHoveredItem(null)}
                      className={cn(
                        'w-full flex items-center gap-3 p-2 rounded-lg transition-all',
                        'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                        hoveredItem === item && 'bg-neutral-100 dark:bg-neutral-800'
                      )}
                    >
                      <div className="flex-shrink-0">
                        <EditorCanvasIconHelper type={item as EditorCanvasTypes} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium">{item}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {cardType.description}
                        </p>
                      </div>
                      <ChevronRight className={cn(
                        'h-4 w-4 text-muted-foreground transition-transform',
                        hoveredItem === item && 'translate-x-1'
                      )} />
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Helpful tip at bottom */}
        <div className="p-2 border-t">
          <p className="text-xs text-muted-foreground">
            💡 Auto-connects to last node
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default QuickAddPanel
