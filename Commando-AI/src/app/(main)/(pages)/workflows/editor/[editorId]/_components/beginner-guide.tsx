'use client'
import React, { useState, useEffect } from 'react'
import { 
  X, 
  ArrowRight, 
  Check, 
  Zap, 
  MousePointer, 
  Link2, 
  Settings,
  Sparkles,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { EditorNodeType } from '@/lib/types'

type Props = {
  nodes: EditorNodeType[]
  onDismiss: () => void
  onStepAction?: (step: number) => void
  className?: string
}

const guideSteps = [
  {
    id: 1,
    title: 'Add a Trigger',
    description: 'Start by adding a trigger node like "Google Drive" to detect when files change',
    icon: Zap,
    checkCondition: (nodes: EditorNodeType[]) => 
      nodes.some(n => n.type === 'Google Drive' || n.type === 'Trigger'),
    tip: 'Click "Add Node" or drag from the sidebar',
  },
  {
    id: 2,
    title: 'Add an Action',
    description: 'Add an action like "Discord" or "Slack" to respond to the trigger',
    icon: MousePointer,
    checkCondition: (nodes: EditorNodeType[]) => 
      nodes.some(n => ['Discord', 'Slack', 'Email', 'Notion', 'AI'].includes(n.type)),
    tip: 'Actions run when your trigger fires',
  },
  {
    id: 3,
    title: 'Connect Nodes',
    description: 'Drag a line from the bottom of one node to the top of another',
    icon: Link2,
    checkCondition: (nodes: EditorNodeType[], edges?: any[]) => 
      (edges?.length || 0) > 0,
    tip: 'Or use Quick Add for auto-connection!',
  },
  {
    id: 4,
    title: 'Configure Settings',
    description: 'Click on nodes to configure their settings in the sidebar',
    icon: Settings,
    checkCondition: () => true, // Manual check
    tip: 'Each node has specific settings to customize',
  },
  {
    id: 5,
    title: 'Save & Publish',
    description: 'Save your workflow using Ctrl+S or the save button',
    icon: Check,
    checkCondition: () => true, // Manual check
    tip: 'Your workflow will be ready to run!',
  },
]

const BeginnerGuide = ({ nodes, onDismiss, onStepAction, className }: Props) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [isMinimized, setIsMinimized] = useState(false)
  const [showGuide, setShowGuide] = useState(true)

  // Check for step completion based on workflow state
  useEffect(() => {
    guideSteps.forEach((step, index) => {
      if (step.checkCondition(nodes) && !completedSteps.includes(index)) {
        setCompletedSteps(prev => [...prev, index])
        if (index === currentStep && index < guideSteps.length - 1) {
          setCurrentStep(index + 1)
        }
      }
    })
  }, [nodes])

  const progress = (completedSteps.length / guideSteps.length) * 100

  // Check localStorage to see if user has dismissed guide before
  useEffect(() => {
    const dismissed = localStorage.getItem('workflow-guide-dismissed')
    if (dismissed === 'true') {
      setShowGuide(false)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem('workflow-guide-dismissed', 'true')
    setShowGuide(false)
    onDismiss()
  }

  const handleReset = () => {
    localStorage.removeItem('workflow-guide-dismissed')
    setCompletedSteps([])
    setCurrentStep(0)
    setShowGuide(true)
  }

  if (!showGuide) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleReset}
        className={cn('gap-2', className)}
      >
        <HelpCircle className="h-4 w-4" />
        Show Guide
      </Button>
    )
  }

  if (isMinimized) {
    return (
      <Card 
        className={cn(
          'cursor-pointer hover:shadow-md transition-shadow',
          className
        )}
        onClick={() => setIsMinimized(false)}
      >
        <CardContent className="p-3 flex items-center gap-3">
          <div className="relative">
            <Sparkles className="h-5 w-5 text-blue-500" />
            {completedSteps.length < guideSteps.length && (
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-orange-500 rounded-full animate-pulse" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Getting Started</p>
            <Progress value={progress} className="h-1 mt-1" />
          </div>
          <span className="text-xs text-muted-foreground">
            {completedSteps.length}/{guideSteps.length}
          </span>
        </CardContent>
      </Card>
    )
  }

  const currentStepData = guideSteps[currentStep]
  const CurrentIcon = currentStepData?.icon || Check

  return (
    <Card className={cn('shadow-md', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Getting Started</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsMinimized(true)}
            >
              <span className="text-lg leading-none">−</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Progress value={progress} className="h-1.5 mt-2" />
        <p className="text-xs text-muted-foreground mt-1">
          {completedSteps.length} of {guideSteps.length} steps completed
        </p>
      </CardHeader>
      <CardContent className="pt-2">
        {/* Steps list */}
        <div className="space-y-2">
          {guideSteps.map((step, index) => {
            const StepIcon = step.icon
            const isCompleted = completedSteps.includes(index)
            const isCurrent = index === currentStep
            
            return (
              <div
                key={step.id}
                className={cn(
                  'flex items-start gap-3 p-2 rounded-lg transition-colors',
                  isCurrent && !isCompleted && 'bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700',
                  isCompleted && 'opacity-60'
                )}
              >
                <div className={cn(
                  'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center',
                  isCompleted 
                    ? 'bg-green-500 text-white' 
                    : isCurrent 
                      ? 'bg-neutral-500 text-white'
                      : 'bg-neutral-200 dark:bg-neutral-700'
                )}>
                  {isCompleted ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <StepIcon className="h-3 w-3" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-medium',
                    isCompleted && 'line-through text-muted-foreground'
                  )}>
                    {step.title}
                  </p>
                  {isCurrent && !isCompleted && (
                    <>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {step.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <ArrowRight className="h-3 w-3" />
                        {step.tip}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Completion message */}
        {completedSteps.length === guideSteps.length && (
          <div className="mt-4 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-center">
            <p className="text-sm font-medium">
              🎉 Great job! You&apos;ve completed the basics!
            </p>
            <Button
              variant="link"
              size="sm"
              onClick={handleDismiss}
            >
              Dismiss guide
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default BeginnerGuide
