'use client'

import React, { useState, useTransition, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  User,
  Trophy,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AIAssigneeSuggestion, AIAlternativeAssignee } from '@/lib/ai/ai.types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  issueKey: string
  issueTitle: string
  onFetchSuggestion: () => Promise<AIAssigneeSuggestion | null>
  onAssign: (userId: string, userName: string) => Promise<void>
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'text-green-500'
  if (confidence >= 0.6) return 'text-yellow-500'
  return 'text-orange-500'
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return 'High Confidence'
  if (confidence >= 0.6) return 'Medium Confidence'
  return 'Low Confidence'
}

function AssigneeCard({
  userId,
  userName,
  confidence,
  reason,
  isTop = false,
  onSelect,
  isSelecting,
}: {
  userId: string
  userName: string
  confidence: number
  reason?: string
  isTop?: boolean
  onSelect: () => void
  isSelecting: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-colors',
        isTop ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className={isTop ? 'bg-primary text-primary-foreground' : ''}>
            {userName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium">{userName}</span>
            {isTop && (
              <Badge variant="secondary" className="text-xs">
                <Trophy className="h-3 w-3 mr-1" />
                Top Match
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className={cn('text-sm font-medium', getConfidenceColor(confidence))}>
              {Math.round(confidence * 100)}% match
            </span>
            <span className="text-xs text-muted-foreground">
              {getConfidenceLabel(confidence)}
            </span>
          </div>
          <Progress value={confidence * 100} className="h-1.5 mb-2" />
          {reason && (
            <p className="text-xs text-muted-foreground line-clamp-2">{reason}</p>
          )}
        </div>
        <Button
          size="sm"
          variant={isTop ? 'default' : 'outline'}
          onClick={onSelect}
          disabled={isSelecting}
        >
          {isSelecting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Assign'}
        </Button>
      </div>
    </div>
  )
}

export function AIAssigneeSuggestionModal({
  open,
  onOpenChange,
  issueKey,
  issueTitle,
  onFetchSuggestion,
  onAssign,
}: Props) {
  const [suggestion, setSuggestion] = useState<AIAssigneeSuggestion | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isFetching, startFetching] = useTransition()
  const [isAssigning, startAssigning] = useTransition()
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null)

  useEffect(() => {
    if (open && !suggestion && !isFetching) {
      handleFetch()
    }
  }, [open])

  const handleFetch = () => {
    setError(null)
    setSuggestion(null)

    startFetching(async () => {
      try {
        const result = await onFetchSuggestion()
        if (result) {
          setSuggestion(result)
        } else {
          setError('Failed to get assignee suggestion. Please try again.')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      }
    })
  }

  const handleAssign = (userId: string, userName: string) => {
    setAssigningUserId(userId)
    startAssigning(async () => {
      try {
        await onAssign(userId, userName)
        onOpenChange(false)
        setSuggestion(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to assign')
      } finally {
        setAssigningUserId(null)
      }
    })
  }

  const handleClose = () => {
    onOpenChange(false)
    setSuggestion(null)
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Assignee Suggestion
          </DialogTitle>
          <DialogDescription>
            AI suggests the best team member for{' '}
            <span className="font-medium text-foreground">{issueKey}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Issue context */}
          <div className="mb-4 p-3 rounded-lg bg-muted/50">
            <p className="text-sm font-medium line-clamp-2">{issueTitle}</p>
          </div>

          {/* Loading state */}
          {isFetching && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">
                Analyzing team skills and workload...
              </p>
            </div>
          )}

          {/* Error state */}
          {error && !isFetching && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={handleFetch} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          )}

          {/* Suggestion result */}
          {suggestion && !isFetching && (
            <div className="space-y-4">
              {/* Top suggestion */}
              <AssigneeCard
                userId={suggestion.suggestedAssigneeId}
                userName={suggestion.suggestedAssigneeName}
                confidence={suggestion.confidence}
                reason={suggestion.reasoning}
                isTop
                onSelect={() =>
                  handleAssign(suggestion.suggestedAssigneeId, suggestion.suggestedAssigneeName)
                }
                isSelecting={isAssigning && assigningUserId === suggestion.suggestedAssigneeId}
              />

              {/* Alternatives */}
              {suggestion.alternativeAssignees && suggestion.alternativeAssignees.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Alternative Options
                  </p>
                  <div className="space-y-2">
                    {suggestion.alternativeAssignees.map((alt) => (
                      <AssigneeCard
                        key={alt.userId}
                        userId={alt.userId}
                        userName={alt.userName}
                        confidence={alt.confidence}
                        reason={alt.reason}
                        onSelect={() => handleAssign(alt.userId, alt.userName)}
                        isSelecting={isAssigning && assigningUserId === alt.userId}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Refresh option */}
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFetch}
                  disabled={isFetching}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Re-analyze
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AIAssigneeSuggestionModal
