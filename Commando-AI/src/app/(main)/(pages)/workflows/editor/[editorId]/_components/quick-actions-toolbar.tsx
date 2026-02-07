'use client'
import React, { useCallback } from 'react'
import { 
  Undo2, 
  Redo2, 
  Save, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  Trash2,
  Copy,
  Layout,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useEditor } from '@/providers/editor-provider'
import { toast } from 'sonner'

type Props = {
  onSave?: () => void
  onUndo?: () => void
  onRedo?: () => void
  onZoomIn?: () => void
  onZoomOut?: () => void
  onFitView?: () => void
  onDeleteSelected?: () => void
  onDuplicateSelected?: () => void
  onAutoLayout?: () => void
  canUndo?: boolean
  canRedo?: boolean
  children?: React.ReactNode
}

const QuickActionsToolbar = ({
  onSave,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onFitView,
  onDeleteSelected,
  onDuplicateSelected,
  onAutoLayout,
  canUndo = false,
  canRedo = false,
  children,
}: Props) => {
  const { state } = useEditor()
  const hasSelectedNode = state.editor.selectedNode.id !== ''

  // Keyboard shortcuts handler
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      // Ctrl/Cmd + S = Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        onSave?.()
        toast.success('Workflow saved!')
      }
      
      // Ctrl/Cmd + Z = Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (canUndo) onUndo?.()
      }
      
      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y = Redo
      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') ||
        ((e.ctrlKey || e.metaKey) && e.key === 'y')
      ) {
        e.preventDefault()
        if (canRedo) onRedo?.()
      }

      // Delete/Backspace = Delete selected node
      if ((e.key === 'Delete' || e.key === 'Backspace') && hasSelectedNode) {
        e.preventDefault()
        onDeleteSelected?.()
      }

      // Ctrl/Cmd + D = Duplicate
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && hasSelectedNode) {
        e.preventDefault()
        onDuplicateSelected?.()
      }

      // Ctrl/Cmd + 0 = Fit view
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault()
        onFitView?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onSave, onUndo, onRedo, onDeleteSelected, onDuplicateSelected, onFitView, canUndo, canRedo, hasSelectedNode])

  const toolbarItems = [
    {
      icon: Undo2,
      label: 'Undo',
      shortcut: 'Ctrl+Z',
      onClick: onUndo,
      disabled: !canUndo,
    },
    {
      icon: Redo2,
      label: 'Redo',
      shortcut: 'Ctrl+Y',
      onClick: onRedo,
      disabled: !canRedo,
    },
    { type: 'separator' as const },
    {
      icon: Save,
      label: 'Save',
      shortcut: 'Ctrl+S',
      onClick: () => {
        onSave?.()
        toast.success('Workflow saved!')
      },
    },
    { type: 'separator' as const },
    {
      icon: ZoomIn,
      label: 'Zoom In',
      shortcut: 'Scroll Up',
      onClick: onZoomIn,
    },
    {
      icon: ZoomOut,
      label: 'Zoom Out',
      shortcut: 'Scroll Down',
      onClick: onZoomOut,
    },
    {
      icon: Maximize2,
      label: 'Fit View',
      shortcut: 'Ctrl+0',
      onClick: onFitView,
    },
    { type: 'separator' as const },
    {
      icon: Copy,
      label: 'Duplicate Node',
      shortcut: 'Ctrl+D',
      onClick: onDuplicateSelected,
      disabled: !hasSelectedNode,
    },
    {
      icon: Trash2,
      label: 'Delete Node',
      shortcut: 'Delete',
      onClick: onDeleteSelected,
      disabled: !hasSelectedNode,
    },
    { type: 'separator' as const },
    {
      icon: Layout,
      label: 'Auto Layout',
      onClick: onAutoLayout,
    },
  ]

  return (
    <TooltipProvider delayDuration={200}>
      <div className="absolute left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-neutral-200 bg-white/95 px-2 py-1.5 shadow-lg backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-900/95">
        {toolbarItems.map((item, index) => {
          if ('type' in item && item.type === 'separator') {
            return (
              <div
                key={index}
                className="mx-1 h-6 w-px bg-neutral-200 dark:bg-neutral-700"
              />
            )
          }

          const { icon: Icon, label, shortcut, onClick, disabled } = item as {
            icon: any
            label: string
            shortcut?: string
            onClick?: () => void
            disabled?: boolean
          }

          return (
            <Tooltip key={label}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  onClick={onClick}
                  disabled={disabled}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="flex items-center gap-2">
                <span>{label}</span>
                {shortcut && (
                  <kbd className="rounded bg-neutral-200 px-1.5 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                    {shortcut}
                  </kbd>
                )}
              </TooltipContent>
            </Tooltip>
          )
        })}
        
        {/* Additional action buttons (AI Generate, Add Node, Templates) */}
        {children && (
          <>
            <div className="mx-1 h-6 w-px bg-neutral-200 dark:bg-neutral-700" />
            <div className="flex items-center gap-2">
              {children}
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  )
}

export default QuickActionsToolbar
