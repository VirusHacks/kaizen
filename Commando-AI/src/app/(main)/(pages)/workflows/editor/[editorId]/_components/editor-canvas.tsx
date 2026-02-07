'use client'
import { EditorCanvasCardType, EditorNodeType, EditorCanvasTypes } from '@/lib/types'
import { useEditor } from '@/providers/editor-provider'
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import ReactFlow, {
  Background,
  Connection,
  Controls,
  Edge,
  EdgeChange,
  MiniMap,
  NodeChange,
  ReactFlowInstance,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from 'reactflow'
import 'reactflow/dist/style.css'
import EditorCanvasCardSingle from './editor-canvas-card-single'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { toast } from 'sonner'
import { usePathname } from 'next/navigation'
import { v4 } from 'uuid'
import { EditorCanvasDefaultCardTypes } from '@/lib/constant'
import FlowInstance from './flow-instance'
import EditorCanvasSidebar from './editor-canvas-sidebar'
import { onGetNodesEdges } from '../../../_actions/workflow-connections'
import QuickActionsToolbar from './quick-actions-toolbar'
import WorkflowTemplates from './workflow-templates'
import QuickAddPanel from './quick-add-panel'
import SmartSuggestions from './smart-suggestions'
import BeginnerGuide from './beginner-guide'
import AIWorkflowGenerator from './ai-workflow-generator'
import NodeConfigModal from './node-config-modal'

type Props = {}

const initialNodes: EditorNodeType[] = []

const initialEdges: { id: string; source: string; target: string }[] = []

const EditorCanvas = (props: Props) => {
  const { dispatch, state } = useEditor()
  const [nodes, setNodes] = useState(initialNodes)
  const [edges, setEdges] = useState(initialEdges)
  const [isWorkFlowLoading, setIsWorkFlowLoading] = useState<boolean>(false)
  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [selectedNodeForConfig, setSelectedNodeForConfig] = useState<EditorNodeType | null>(null)
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance>()
  const pathname = usePathname()

  // Track if we're syncing from editor state to prevent infinite loops
  const isSyncingFromEditorState = useRef(false)
  const lastSyncedMetadata = useRef<string>('')

  // History for undo/redo functionality - moved before onDrop to avoid reference error
  const [history, setHistory] = useState<{ nodes: EditorNodeType[]; edges: any[] }[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Save current state to history
  const saveToHistory = useCallback(() => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push({ nodes: [...nodes], edges: [...edges] })
      return newHistory.slice(-50) // Keep last 50 states
    })
    setHistoryIndex(prev => Math.min(prev + 1, 49))
  }, [nodes, edges, historyIndex])

  const onDragOver = useCallback((event: any) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      //@ts-ignore
      setNodes((nds) => applyNodeChanges(changes, nds))
    },
    [setNodes]
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) =>
      //@ts-ignore
      setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  )

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    []
  )

  const onDrop = useCallback(
    (event: any) => {
      event.preventDefault()

      const type: EditorCanvasCardType['type'] = event.dataTransfer.getData(
        'application/reactflow'
      )

      // check if the dropped element is valid
      if (typeof type === 'undefined' || !type) {
        return
      }

      // Check for existing trigger
      const triggerAlreadyExists = nodes.find(
        (node) => node.type === 'Trigger'
      )

      if (type === 'Trigger' && triggerAlreadyExists) {
        toast.error('Only one trigger can be added to automations at the moment')
        return
      }

      if (!reactFlowInstance) {
        toast.error('Editor not ready, please try again')
        return
      }
      
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const newNode = {
        id: v4(),
        type,
        position,
        data: {
          title: type,
          description: EditorCanvasDefaultCardTypes[type].description,
          completed: false,
          current: false,
          metadata: {},
          type: type,
        },
      }
      
      // Save history before adding
      saveToHistory()
      
      //@ts-ignore
      setNodes((nds) => nds.concat(newNode))
      toast.success(`${type} node added!`)
    },
    [reactFlowInstance, nodes, saveToHistory]
  )

  const handleClickCanvas = () => {
    dispatch({
      type: 'SELECTED_ELEMENT',
      payload: {
        element: {
          data: {
            completed: false,
            current: false,
            description: '',
            metadata: {},
            title: '',
            type: 'Trigger',
          },
          id: '',
          position: { x: 0, y: 0 },
          type: 'Trigger',
        },
      },
    })
  }

  // Sync local nodes/edges to editor state, but skip if we're syncing from editor state
  useEffect(() => {
    if (isSyncingFromEditorState.current) return
    dispatch({ type: 'LOAD_DATA', payload: { edges, elements: nodes } })
  }, [nodes, edges])

  const nodeTypes = useMemo(
    () => ({
      Action: EditorCanvasCardSingle,
      Trigger: EditorCanvasCardSingle,
      Email: EditorCanvasCardSingle,
      Condition: EditorCanvasCardSingle,
      AI: EditorCanvasCardSingle,
      Slack: EditorCanvasCardSingle,
      'Google Drive': EditorCanvasCardSingle,
      Notion: EditorCanvasCardSingle,
      Discord: EditorCanvasCardSingle,
      'Custom Webhook': EditorCanvasCardSingle,
      'Google Calendar': EditorCanvasCardSingle,
      Wait: EditorCanvasCardSingle,
      'HTTP Request': EditorCanvasCardSingle,
      'Schedule Trigger': EditorCanvasCardSingle,
      'Text Formatter': EditorCanvasCardSingle,
      'Data Filter': EditorCanvasCardSingle,
      'Code': EditorCanvasCardSingle,
    }),
    []
  )

  const onGetWorkFlow = async () => {
    setIsWorkFlowLoading(true)
    const response = await onGetNodesEdges(pathname.split('/').pop()!)
    if (response) {
      setEdges(JSON.parse(response.edges!))
      setNodes(JSON.parse(response.nodes!))
      setIsWorkFlowLoading(false)
    }
    setIsWorkFlowLoading(false)
  }

  // Undo handler
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1]
      setNodes(prevState.nodes)
      setEdges(prevState.edges)
      setHistoryIndex(prev => prev - 1)
    }
  }, [history, historyIndex])

  // Redo handler
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1]
      setNodes(nextState.nodes)
      setEdges(nextState.edges)
      setHistoryIndex(prev => prev + 1)
    }
  }, [history, historyIndex])

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    reactFlowInstance?.zoomIn()
  }, [reactFlowInstance])

  const handleZoomOut = useCallback(() => {
    reactFlowInstance?.zoomOut()
  }, [reactFlowInstance])

  const handleFitView = useCallback(() => {
    reactFlowInstance?.fitView()
  }, [reactFlowInstance])

  // Delete selected node
  const handleDeleteSelected = useCallback(() => {
    if (state.editor.selectedNode.id) {
      saveToHistory()
      setNodes(nds => nds.filter(n => n.id !== state.editor.selectedNode.id))
      setEdges(eds => eds.filter(e => 
        e.source !== state.editor.selectedNode.id && 
        e.target !== state.editor.selectedNode.id
      ))
      toast.success('Node deleted')
    }
  }, [state.editor.selectedNode.id, saveToHistory])

  // Sync node metadata from editor state to local nodes state
  // This ensures config saved in the modal is reflected in the nodes passed to FlowInstance for DB saving
  useEffect(() => {
    if (state.editor.elements.length === 0 || nodes.length === 0) return
    
    // Build a metadata snapshot from editor state
    const editorMetadataSnapshot = state.editor.elements
      .filter(el => el.data?.metadata && Object.keys(el.data.metadata).length > 0)
      .map(el => ({ id: el.id, metadata: el.data.metadata }))
    
    const editorMetadataStr = JSON.stringify(editorMetadataSnapshot)
    
    // Skip if nothing changed or if we just synced this
    if (editorMetadataStr === lastSyncedMetadata.current) return
    if (editorMetadataSnapshot.length === 0) return
    
    // Check if any local node needs updating
    let needsUpdate = false
    for (const item of editorMetadataSnapshot) {
      const localNode = nodes.find(n => n.id === item.id)
      if (localNode) {
        const localMetadata = JSON.stringify(localNode.data?.metadata || {})
        const editorMetadata = JSON.stringify(item.metadata || {})
        if (localMetadata !== editorMetadata) {
          needsUpdate = true
          break
        }
      }
    }
    
    if (!needsUpdate) {
      lastSyncedMetadata.current = editorMetadataStr
      return
    }
    
    // Mark that we're syncing to prevent loop
    isSyncingFromEditorState.current = true
    lastSyncedMetadata.current = editorMetadataStr
    
    setNodes(currentNodes => {
      return currentNodes.map(node => {
        const stateNode = state.editor.elements.find(el => el.id === node.id)
        if (stateNode && stateNode.data?.metadata && Object.keys(stateNode.data.metadata).length > 0) {
          return {
            ...node,
            data: {
              ...node.data,
              metadata: stateNode.data.metadata
            }
          }
        }
        return node
      })
    })
    
    // Reset sync flag after a tick
    setTimeout(() => {
      isSyncingFromEditorState.current = false
    }, 0)
  }, [state.editor.elements, nodes.length])

  // Duplicate selected node
  const handleDuplicateSelected = useCallback(() => {
    if (state.editor.selectedNode.id) {
      const selectedNode = nodes.find(n => n.id === state.editor.selectedNode.id)
      if (selectedNode) {
        saveToHistory()
        const newNode = {
          ...selectedNode,
          id: v4(),
          position: {
            x: selectedNode.position.x + 50,
            y: selectedNode.position.y + 50,
          },
        }
        setNodes(nds => [...nds, newNode])
        toast.success('Node duplicated')
      }
    }
  }, [state.editor.selectedNode.id, nodes, saveToHistory])

  // Auto layout handler (simple grid layout)
  const handleAutoLayout = useCallback(() => {
    saveToHistory()
    const layoutedNodes = nodes.map((node, index) => ({
      ...node,
      position: {
        x: 150 + (index % 3) * 300,
        y: 100 + Math.floor(index / 3) * 200,
      },
    }))
    setNodes(layoutedNodes)
    setTimeout(() => reactFlowInstance?.fitView(), 100)
    toast.success('Auto layout applied')
  }, [nodes, reactFlowInstance, saveToHistory])

  // Apply workflow template
  const handleApplyTemplate = useCallback((template: any) => {
    if (nodes.length > 0) {
      if (!confirm('This will replace your current workflow. Continue?')) {
        return
      }
    }
    saveToHistory()
    setNodes(template.nodes)
    setEdges(template.edges)
    setTimeout(() => reactFlowInstance?.fitView(), 100)
    toast.success(`Template "${template.name}" applied!`)
  }, [nodes.length, reactFlowInstance, saveToHistory])

  // Single-click add node with auto-connect
  const handleAddNode = useCallback((nodeType: string, autoConnect: boolean = true) => {
    // Check if it's a trigger and one already exists
    const isTrigger = EditorCanvasDefaultCardTypes[nodeType as keyof typeof EditorCanvasDefaultCardTypes]?.type === 'Trigger'
    const triggerExists = nodes.some(n => 
      EditorCanvasDefaultCardTypes[n.type as keyof typeof EditorCanvasDefaultCardTypes]?.type === 'Trigger'
    )

    if (isTrigger && triggerExists) {
      toast.error('Only one trigger can be added to automations at the moment')
      return
    }

    saveToHistory()

    // Calculate position - place to the right of the last node or in center
    let position = { x: 250, y: 200 }
    if (nodes.length > 0) {
      const lastNode = nodes[nodes.length - 1]
      position = {
        x: lastNode.position.x + 300,
        y: lastNode.position.y,
      }
    }

    const newNodeId = v4()
    const newNode: EditorNodeType = {
      id: newNodeId,
      type: nodeType as EditorCanvasTypes,
      position,
      data: {
        title: nodeType,
        description: EditorCanvasDefaultCardTypes[nodeType as keyof typeof EditorCanvasDefaultCardTypes]?.description || '',
        completed: false,
        current: false,
        metadata: {},
        type: nodeType as EditorCanvasTypes,
      },
    }

    setNodes(nds => [...nds, newNode])

    // Auto-connect to the last non-trigger node if enabled
    if (autoConnect && nodes.length > 0 && !isTrigger) {
      const lastNode = nodes[nodes.length - 1]
      const newEdge = {
        id: v4(),
        source: lastNode.id,
        target: newNodeId,
      }
      setEdges(eds => [...eds, newEdge])
    }

    // Fit view after adding
    setTimeout(() => reactFlowInstance?.fitView({ padding: 0.2 }), 100)
    toast.success(`${nodeType} node added!`)
  }, [nodes, saveToHistory, reactFlowInstance])

  // Update node data handler
  const handleUpdateNodeData = useCallback((nodeId: string, data: any) => {
    setNodes(nds => nds.map(node => 
      node.id === nodeId ? { ...node, data } : node
    ))
  }, [])

  // Get selected node for smart suggestions
  const selectedNode = useMemo(() => {
    return nodes.find(n => n.id === state.editor.selectedNode.id) || null
  }, [nodes, state.editor.selectedNode.id])

  useEffect(() => {
    onGetWorkFlow()
  }, [])

  return (
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel defaultSize={70}>
        <div className="flex h-full items-center justify-center">
          <div
            style={{ width: '100%', height: '100%', paddingBottom: '70px' }}
            className="relative"
          >
            {isWorkFlowLoading ? (
              <div className="absolute flex h-full w-full items-center justify-center">
                <svg
                  aria-hidden="true"
                  className="inline h-8 w-8 animate-spin fill-blue-600 text-gray-200 dark:text-gray-600"
                  viewBox="0 0 100 101"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                    fill="currentColor"
                  />
                  <path
                    d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                    fill="currentFill"
                  />
                </svg>
              </div>
            ) : (
              <>
                {/* Quick Actions Toolbar */}
                <QuickActionsToolbar
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  onZoomIn={handleZoomIn}
                  onZoomOut={handleZoomOut}
                  onFitView={handleFitView}
                  onDeleteSelected={handleDeleteSelected}
                  onDuplicateSelected={handleDuplicateSelected}
                  onAutoLayout={handleAutoLayout}
                  canUndo={historyIndex > 0}
                  canRedo={historyIndex < history.length - 1}
                >
                  {/* AI Generate and other buttons inside toolbar */}
                  <AIWorkflowGenerator 
                    onApplyWorkflow={handleApplyTemplate}
                    existingNodes={nodes}
                  />
                  <QuickAddPanel 
                    nodes={nodes} 
                    onAddNode={handleAddNode}
                  />
                  <WorkflowTemplates onApplyTemplate={handleApplyTemplate} />
                </QuickActionsToolbar>

                {/* Beginner Guide - bottom left above minimap */}
                <div className="absolute bottom-28 left-4 z-50 w-72 pointer-events-auto">
                  <BeginnerGuide 
                    nodes={nodes}
                    onDismiss={() => {}}
                  />
                </div>

                <ReactFlow
                  className="w-full h-full"
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  nodes={nodes}
                  onNodesChange={onNodesChange}
                  edges={edges}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onInit={setReactFlowInstance}
                  fitView
                  onClick={handleClickCanvas}
                  onNodeDoubleClick={(event, node) => {
                    event.stopPropagation()
                    const fullNode = nodes.find(n => n.id === node.id)
                    if (fullNode) {
                      setSelectedNodeForConfig(fullNode)
                      setConfigModalOpen(true)
                    }
                  }}
                  nodeTypes={nodeTypes}
                >
                  <Controls position="top-left" />
                  <MiniMap
                    position="bottom-left"
                    className="!bg-background"
                    zoomable
                    pannable
                  />
                  <Background
                    //@ts-ignore
                    variant="dots"
                    gap={12}
                    size={1}
                  />
                </ReactFlow>
              </>
            )}
          </div>
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel
        defaultSize={40}
        className="relative sm:block"
      >
        {isWorkFlowLoading ? (
          <div className="absolute flex h-full w-full items-center justify-center">
            <svg
              aria-hidden="true"
              className="inline h-8 w-8 animate-spin fill-blue-600 text-gray-200 dark:text-gray-600"
              viewBox="0 0 100 101"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                fill="currentColor"
              />
              <path
                d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                fill="currentFill"
              />
            </svg>
          </div>
        ) : (
          <FlowInstance
            edges={edges}
            nodes={nodes}
          >
            <EditorCanvasSidebar 
              nodes={nodes} 
              onAddNode={handleAddNode}
            />
          </FlowInstance>
        )}
      </ResizablePanel>
      
      {/* Node Configuration Modal - opens on double-click */}
      <NodeConfigModal
        isOpen={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        node={selectedNodeForConfig}
      />
    </ResizablePanelGroup>
  )
}

export default EditorCanvas
