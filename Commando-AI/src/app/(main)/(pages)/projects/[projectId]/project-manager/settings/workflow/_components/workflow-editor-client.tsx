'use client'

import React, { useCallback, useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  MarkerType,
  NodeProps,
  Handle,
  Position,
  BackgroundVariant,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  RotateCcw,
  User,
  Loader2,
  Save,
  Trash2,
  Settings,
  ZoomIn,
  ZoomOut,
  Maximize,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  addTransition,
  removeTransition,
  updateTransition,
  resetWorkflowToDefault,
  updateNodePositions,
} from '../_actions/workflow-actions'

// Types
type WorkflowStatus = {
  id: string
  status: string
  displayName: string
  order: number
  color: string
  positionX: number
  positionY: number
}

type WorkflowTransition = {
  id: string
  name: string | null
  requiresAssignee: boolean
  requiresComment: boolean
  fromStatus: WorkflowStatus
  toStatus: WorkflowStatus
}

type Workflow = {
  id: string
  name: string
  description: string | null
  statuses: WorkflowStatus[]
  transitions: WorkflowTransition[]
}

type Props = {
  workflow: Workflow
  projectId: string
  projectName: string
}

// Custom Node Component for Status
const StatusNode = ({ data, selected }: NodeProps) => {
  return (
    <div
      className={cn(
        'px-4 py-3 rounded-lg border-2 shadow-lg min-w-[140px] transition-all',
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
      style={{
        backgroundColor: `${data.color}15`,
        borderColor: data.color as string,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-muted-foreground"
      />
      <div className="flex flex-col items-center gap-1">
        <div
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: data.color as string }}
        />
        <span className="font-semibold text-sm">{data.displayName as string}</span>
        <span className="text-xs text-muted-foreground">{data.status as string}</span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-muted-foreground"
      />
    </div>
  )
}

const nodeTypes = {
  statusNode: StatusNode,
}

// Inner component that uses React Flow hooks
const WorkflowEditorInner = ({ workflow, projectId, projectName }: Props) => {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [selectedEdge, setSelectedEdge] = useState<WorkflowTransition | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const { fitView, zoomIn, zoomOut } = useReactFlow()

  // Convert workflow data to React Flow nodes and edges
  const initialNodes: Node[] = useMemo(() => 
    workflow.statuses.map((status) => ({
      id: status.id,
      type: 'statusNode',
      position: { x: status.positionX, y: status.positionY },
      data: {
        displayName: status.displayName,
        status: status.status,
        color: status.color,
      },
    })),
    [workflow.statuses]
  )

  const initialEdges: Edge[] = useMemo(() =>
    workflow.transitions.map((transition) => ({
      id: transition.id,
      source: transition.fromStatus.id,
      target: transition.toStatus.id,
      type: 'smoothstep',
      animated: false,
      style: { stroke: '#64748b', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#64748b',
      },
      label: transition.name || undefined,
      labelStyle: { fontSize: 10, fill: '#94a3b8' },
      labelBgStyle: { fill: '#0a0a0a', fillOpacity: 0.8 },
      data: {
        transition,
      },
    })),
    [workflow.transitions]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Handle node position changes
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, _node: Node) => {
      setHasUnsavedChanges(true)
    },
    []
  )

  // Handle edge click to edit transition
  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      const transition = workflow.transitions.find((t) => t.id === edge.id)
      if (transition) {
        setSelectedEdge(transition)
        setIsSheetOpen(true)
      }
    },
    [workflow.transitions]
  )

  // Handle new connection (create transition)
  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return

      // Check if transition already exists
      const exists = workflow.transitions.some(
        (t) =>
          t.fromStatus.id === params.source && t.toStatus.id === params.target
      )
      if (exists) {
        toast.error('This transition already exists')
        return
      }

      if (params.source === params.target) {
        toast.error('Cannot create self-transition')
        return
      }

      startTransition(async () => {
        const result = await addTransition(projectId, workflow.id, {
          fromStatusId: params.source!,
          toStatusId: params.target!,
        })

        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success('Transition created')
          router.refresh()
        }
      })
    },
    [workflow.transitions, workflow.id, projectId, router]
  )

  // Save node positions
  const handleSavePositions = useCallback(() => {
    const positions = nodes.map((node) => ({
      id: node.id,
      x: node.position.x,
      y: node.position.y,
    }))

    startTransition(async () => {
      const result = await updateNodePositions(projectId, positions)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Positions saved')
        setHasUnsavedChanges(false)
      }
    })
  }, [nodes, projectId])

  // Delete transition
  const handleDeleteTransition = useCallback(
    (transitionId: string) => {
      startTransition(async () => {
        const result = await removeTransition(projectId, transitionId)

        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success('Transition deleted')
          setIsSheetOpen(false)
          setSelectedEdge(null)
          router.refresh()
        }
      })
    },
    [projectId, router]
  )

  // Toggle requires assignee
  const handleToggleRequiresAssignee = useCallback(
    (transitionId: string, currentValue: boolean) => {
      startTransition(async () => {
        const result = await updateTransition(projectId, transitionId, {
          requiresAssignee: !currentValue,
        })

        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success('Transition updated')
          router.refresh()
        }
      })
    },
    [projectId, router]
  )

  // Reset workflow
  const handleResetWorkflow = useCallback(() => {
    startTransition(async () => {
      const result = await resetWorkflowToDefault(projectId)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Workflow reset to default')
        setHasUnsavedChanges(false)
        router.refresh()
      }
    })
  }, [projectId, router])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {workflow.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            Drag nodes to reposition • Click edges to edit transitions • Connect nodes to create transitions
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <Badge variant="secondary" className="animate-pulse">
              Unsaved changes
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSavePositions}
            disabled={isPending || !hasUnsavedChanges}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Layout
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={isPending}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset Workflow?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will reset the workflow to the default configuration. All
                  custom transitions will be lost. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetWorkflow}>
                  Reset Workflow
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 bg-background">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          onEdgeClick={onEdgeClick}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          defaultEdgeOptions={{
            type: 'smoothstep',
            markerEnd: {
              type: MarkerType.ArrowClosed,
            },
          }}
          connectionLineStyle={{ stroke: '#64748b', strokeWidth: 2 }}
          proOptions={{ hideAttribution: true }}
          className="bg-background"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#333"
          />
          <Controls
            showZoom={false}
            showFitView={false}
            showInteractive={false}
          />
          <MiniMap
            nodeColor={(node) => node.data.color as string}
            maskColor="rgba(0, 0, 0, 0.8)"
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #333',
            }}
          />

          {/* Custom Controls Panel */}
          <Panel position="bottom-left" className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => zoomIn()}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => zoomOut()}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => fitView({ padding: 0.2 })}
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </Panel>

          {/* Stats Panel */}
          <Panel position="top-right">
            <Card className="bg-background/80 backdrop-blur">
              <CardContent className="p-3">
                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Statuses:</span>{' '}
                    <span className="font-semibold">{workflow.statuses.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Transitions:</span>{' '}
                    <span className="font-semibold">{workflow.transitions.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Panel>
        </ReactFlow>
      </div>

      {/* Transition Edit Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit Transition</SheetTitle>
            <SheetDescription>
              Configure transition settings and rules
            </SheetDescription>
          </SheetHeader>
          {selectedEdge && (
            <div className="mt-6 space-y-6">
              {/* Transition Info */}
              <div className="space-y-2">
                <Label>Transition</Label>
                <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
                  <Badge style={{ backgroundColor: selectedEdge.fromStatus.color }}>
                    {selectedEdge.fromStatus.displayName}
                  </Badge>
                  <span className="text-muted-foreground">→</span>
                  <Badge style={{ backgroundColor: selectedEdge.toStatus.color }}>
                    {selectedEdge.toStatus.displayName}
                  </Badge>
                </div>
              </div>

              {/* Name */}
              {selectedEdge.name && (
                <div className="space-y-2">
                  <Label>Name</Label>
                  <p className="text-sm text-muted-foreground">{selectedEdge.name}</p>
                </div>
              )}

              {/* Requirements */}
              <div className="space-y-4">
                <Label>Requirements</Label>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Requires Assignee</p>
                      <p className="text-xs text-muted-foreground">
                        Issue must have an assignee for this transition
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={selectedEdge.requiresAssignee}
                    onCheckedChange={() =>
                      handleToggleRequiresAssignee(
                        selectedEdge.id,
                        selectedEdge.requiresAssignee
                      )
                    }
                    disabled={isPending}
                  />
                </div>
              </div>

              {/* Delete */}
              <div className="pt-4 border-t">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full" disabled={isPending}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Transition
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Transition?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove the transition from{' '}
                        {selectedEdge.fromStatus.displayName} to{' '}
                        {selectedEdge.toStatus.displayName}. Users will no longer
                        be able to move issues via this path.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteTransition(selectedEdge.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

// Wrapper with ReactFlowProvider
const WorkflowEditorClient = (props: Props) => {
  return (
    <ReactFlowProvider>
      <WorkflowEditorInner {...props} />
    </ReactFlowProvider>
  )
}

export default WorkflowEditorClient
