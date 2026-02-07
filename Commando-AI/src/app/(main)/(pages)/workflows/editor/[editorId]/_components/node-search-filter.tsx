'use client'
import React, { useState, useMemo } from 'react'
import { Search, ChevronDown, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EditorCanvasDefaultCardTypes } from '@/lib/constant'
import { EditorCanvasTypes } from '@/lib/types'
import { onDragStart } from '@/lib/editor-utils'
import EditorCanvasIconHelper from './editor-canvas-card-icon-hepler'
import { cn } from '@/lib/utils'

type Props = {
  nodes: any[]
  showOnlyAvailable?: boolean
}

// Categorize node types for better organization
const nodeCategories = {
  Triggers: ['Trigger', 'Google Drive', 'Schedule Trigger'],
  Integrations: ['Slack', 'Discord', 'Notion', 'Google Calendar'],
  Communication: ['Email', 'Custom Webhook', 'HTTP Request'],
  'AI & Logic': ['AI', 'Condition', 'Wait'],
  'Data Processing': ['Text Formatter', 'Data Filter', 'Code'],
  General: ['Action'],
}

const NodeSearchAndFilter = ({ nodes, showOnlyAvailable = true }: Props) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<string[]>(Object.keys(nodeCategories))

  // Determine which node types are available based on current workflow state
  const availableNodeTypes = useMemo(() => {
    const hasTrigger = nodes.some(
      (node) => EditorCanvasDefaultCardTypes[node.type as keyof typeof EditorCanvasDefaultCardTypes]?.type === 'Trigger'
    )
    
    return Object.entries(EditorCanvasDefaultCardTypes)
      .filter(([_, cardType]) => {
        if (showOnlyAvailable) {
          // If no nodes, only show triggers
          if (!nodes.length) return cardType.type === 'Trigger'
          // If has trigger, show actions
          if (hasTrigger) return cardType.type === 'Action'
          // Otherwise show all
          return true
        }
        return true
      })
      .map(([key]) => key)
  }, [nodes, showOnlyAvailable])

  // Filter nodes based on search term
  const filteredCategories = useMemo(() => {
    const searchLower = searchTerm.toLowerCase()
    const result: Record<string, string[]> = {}

    for (const [category, types] of Object.entries(nodeCategories)) {
      const filtered = types.filter((type) => {
        // Check if matches search
        const matchesSearch =
          type.toLowerCase().includes(searchLower) ||
          EditorCanvasDefaultCardTypes[type as keyof typeof EditorCanvasDefaultCardTypes]?.description
            ?.toLowerCase()
            .includes(searchLower)

        // Check if available
        const isAvailable = !showOnlyAvailable || availableNodeTypes.includes(type)

        return matchesSearch && isAvailable
      })

      if (filtered.length > 0) {
        result[category] = filtered
      }
    }

    return result
  }, [searchTerm, availableNodeTypes, showOnlyAvailable])

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        <Input
          type="text"
          placeholder="Search nodes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Quick filter hint */}
      {searchTerm && (
        <p className="text-xs text-neutral-500">
          Found {Object.values(filteredCategories).flat().length} nodes
        </p>
      )}

      {/* Categorized nodes */}
      <div className="flex flex-col gap-2">
        {Object.entries(filteredCategories).map(([category, types]) => (
          <div key={category} className="rounded-lg border border-neutral-200 dark:border-neutral-700">
            {/* Category header */}
            <button
              className="flex w-full items-center justify-between p-2 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800"
              onClick={() => toggleCategory(category)}
            >
              <span className="flex items-center gap-2">
                {expandedCategories.includes(category) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                {category}
              </span>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs dark:bg-neutral-800">
                {types.length}
              </span>
            </button>

            {/* Category items */}
            {expandedCategories.includes(category) && (
              <div className="border-t border-neutral-200 p-2 dark:border-neutral-700">
                <div className="flex flex-col gap-2">
                  {types.map((cardKey) => {
                    const cardValue = EditorCanvasDefaultCardTypes[cardKey as keyof typeof EditorCanvasDefaultCardTypes]
                    const isDisabled = showOnlyAvailable && !availableNodeTypes.includes(cardKey)

                    return (
                      <Card
                        key={cardKey}
                        draggable={!isDisabled}
                        className={cn(
                          'w-full border-black bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900',
                          isDisabled
                            ? 'cursor-not-allowed opacity-50'
                            : 'cursor-grab transition-all hover:shadow-sm'
                        )}
                        onDragStart={(event) => {
                          if (!isDisabled) {
                            onDragStart(event, cardKey as EditorCanvasTypes)
                          }
                        }}
                      >
                        <CardHeader className="flex flex-row items-center gap-3 p-3">
                          <EditorCanvasIconHelper type={cardKey as EditorCanvasTypes} />
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-sm">{cardKey}</CardTitle>
                            <CardDescription className="text-xs line-clamp-1">
                              {cardValue.description}
                            </CardDescription>
                          </div>
                        </CardHeader>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* No results message */}
      {Object.keys(filteredCategories).length === 0 && (
        <div className="py-8 text-center text-sm text-neutral-500">
          No nodes found matching &quot;{searchTerm}&quot;
        </div>
      )}
    </div>
  )
}

export default NodeSearchAndFilter
