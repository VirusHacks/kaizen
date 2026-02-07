'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type AIButtonVariant = 'default' | 'outline' | 'ghost' | 'secondary'
type AIButtonSize = 'default' | 'sm' | 'lg' | 'icon'

interface AIButtonProps {
  children: React.ReactNode
  onClick: () => void
  isLoading?: boolean
  disabled?: boolean
  variant?: AIButtonVariant
  size?: AIButtonSize
  tooltip?: string
  className?: string
  showSparkles?: boolean
}

/**
 * AI-branded button component with sparkle icon and loading state
 */
export function AIButton({
  children,
  onClick,
  isLoading = false,
  disabled = false,
  variant = 'default',
  size = 'default',
  tooltip,
  className,
  showSparkles = true,
}: AIButtonProps) {
  const button = (
    <Button
      onClick={onClick}
      disabled={disabled || isLoading}
      variant={variant}
      size={size}
      className={cn(
        'transition-all',
        variant === 'default' && 'bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90',
        className
      )}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : showSparkles ? (
        <Sparkles className="h-4 w-4 mr-2" />
      ) : null}
      {children}
    </Button>
  )

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return button
}

interface AIIconButtonProps {
  onClick: () => void
  isLoading?: boolean
  disabled?: boolean
  tooltip?: string
  className?: string
  variant?: AIButtonVariant
}

/**
 * AI-branded icon-only button
 */
export function AIIconButton({
  onClick,
  isLoading = false,
  disabled = false,
  tooltip = 'AI Assist',
  className,
  variant = 'ghost',
}: AIIconButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button
            onClick={onClick}
            disabled={disabled || isLoading}
            variant={variant}
            size="icon"
            className={cn(
              'h-8 w-8',
              variant === 'ghost' && 'hover:bg-primary/10',
              className
            )}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 text-primary" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * AI badge to indicate AI-generated content
 */
export function AIBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        'bg-gradient-to-r from-primary/10 to-purple-500/10',
        'text-primary border border-primary/20',
        className
      )}
    >
      <Sparkles className="h-3 w-3" />
      AI Generated
    </span>
  )
}

/**
 * AI label for inline use
 */
export function AILabel({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs text-primary font-medium',
        className
      )}
    >
      <Sparkles className="h-3 w-3" />
      {children || 'AI Suggestion'}
    </span>
  )
}

/**
 * AI loading indicator
 */
export function AILoadingIndicator({
  text = 'AI is thinking...',
  className,
}: {
  text?: string
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      <span>{text}</span>
    </div>
  )
}

/**
 * AI empty state for when AI features are available
 */
export function AIEmptyState({
  title,
  description,
  actionLabel,
  onAction,
  isLoading,
  className,
}: {
  title: string
  description: string
  actionLabel: string
  onAction: () => void
  isLoading?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center mb-4">
        <Sparkles className="h-8 w-8 text-primary" />
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      <AIButton onClick={onAction} isLoading={isLoading}>
        {actionLabel}
      </AIButton>
    </div>
  )
}

export default {
  AIButton,
  AIIconButton,
  AIBadge,
  AILabel,
  AILoadingIndicator,
  AIEmptyState,
}
