'use client'
import React, { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  children: React.ReactNode
  onDragEnter?: () => void
  onDragLeave?: () => void
  className?: string
}

/**
 * Enhanced drop zone with visual feedback for drag and drop
 * Wraps the ReactFlow canvas to provide better UX
 * 
 * IMPORTANT: This component only provides visual feedback.
 * It does NOT handle the actual drop - that's done by ReactFlow's onDrop handler.
 * We use pointer-events-none on overlays to ensure drops go through to ReactFlow.
 */
const EnhancedDropZone = ({
  children,
  onDragEnter,
  onDragLeave,
  className,
}: Props) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [dragCounter, setDragCounter] = useState(0)

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      // Don't prevent default - let it propagate to ReactFlow
      setDragCounter((prev) => prev + 1)
      setIsDraggingOver(true)
      onDragEnter?.()
    },
    [onDragEnter]
  )

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      // Don't prevent default - let it propagate to ReactFlow
      setDragCounter((prev) => {
        const newCount = prev - 1
        if (newCount === 0) {
          setIsDraggingOver(false)
          onDragLeave?.()
        }
        return newCount
      })
    },
    [onDragLeave]
  )

  const handleDrop = useCallback((e: React.DragEvent) => {
    // Reset visual state - don't prevent default, let ReactFlow handle the drop
    setDragCounter(0)
    setIsDraggingOver(false)
  }, [])

  return (
    <div
      className={cn('relative h-full w-full', className)}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
      
      {/* Visual overlay when dragging */}
      {isDraggingOver && (
        <div className="pointer-events-none absolute inset-0 z-40">
          {/* Border indicator */}
          <div className="absolute inset-2 rounded-lg border-2 border-dashed border-neutral-400 dark:border-neutral-500 bg-neutral-500/5" />
          
          {/* Center message */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform">
            <div className="flex flex-col items-center gap-2 rounded-lg bg-neutral-800 dark:bg-neutral-700 px-6 py-4 text-white shadow-lg">
              <div className="text-2xl">➕</div>
              <span className="font-medium">Drop to add node</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Hook for managing drag state across the editor
 */
export const useDragState = () => {
  const [isDragging, setIsDragging] = useState(false)
  const [dragType, setDragType] = useState<string | null>(null)

  const startDrag = useCallback((type: string) => {
    setIsDragging(true)
    setDragType(type)
  }, [])

  const endDrag = useCallback(() => {
    setIsDragging(false)
    setDragType(null)
  }, [])

  return {
    isDragging,
    dragType,
    startDrag,
    endDrag,
  }
}

/**
 * Draggable card wrapper with enhanced visual feedback
 */
type DraggableCardProps = {
  children: React.ReactNode
  nodeType: string
  onDragStart?: (type: string) => void
  onDragEnd?: () => void
  disabled?: boolean
  className?: string
}

export const DraggableCard = ({
  children,
  nodeType,
  onDragStart,
  onDragEnd,
  disabled = false,
  className,
}: DraggableCardProps) => {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (disabled) {
        e.preventDefault()
        return
      }
      e.dataTransfer.setData('application/reactflow', nodeType)
      e.dataTransfer.effectAllowed = 'move'
      setIsDragging(true)
      onDragStart?.(nodeType)
    },
    [nodeType, onDragStart, disabled]
  )

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
    onDragEnd?.()
  }, [onDragEnd])

  return (
    <div
      draggable={!disabled}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        'transition-all duration-200',
        isDragging && 'scale-105 opacity-50 shadow-lg',
        disabled && 'cursor-not-allowed opacity-50',
        !disabled && 'cursor-grab active:cursor-grabbing',
        className
      )}
    >
      {children}
    </div>
  )
}

export default EnhancedDropZone
