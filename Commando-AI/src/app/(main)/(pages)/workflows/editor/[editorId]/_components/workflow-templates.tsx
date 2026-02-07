'use client'
import React, { useState } from 'react'
import { 
  FileJson, 
  Bell, 
  Zap, 
  Clock, 
  MessageSquare,
  FolderPlus,
  X,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { v4 } from 'uuid'
import { EditorCanvasDefaultCardTypes } from '@/lib/constant'
import { EditorCanvasTypes } from '@/lib/types'

// Pre-built workflow templates
export const workflowTemplates = [
  {
    id: 'drive-discord',
    name: 'Google Drive to Discord',
    description: 'Send Discord notification when files change in Google Drive',
    icon: FolderPlus,
    category: 'Notifications',
    nodes: [
      {
        id: 'trigger-1',
        type: 'Google Drive',
        position: { x: 100, y: 200 },
        data: {
          title: 'Google Drive',
          description: EditorCanvasDefaultCardTypes['Google Drive'].description,
          completed: false,
          current: false,
          metadata: {},
          type: 'Google Drive',
        },
      },
      {
        id: 'action-1',
        type: 'Discord',
        position: { x: 400, y: 200 },
        data: {
          title: 'Discord',
          description: EditorCanvasDefaultCardTypes['Discord'].description,
          completed: false,
          current: false,
          metadata: {},
          type: 'Discord',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'action-1' },
    ],
  },
  {
    id: 'drive-slack',
    name: 'Google Drive to Slack',
    description: 'Post Slack message when Google Drive files are updated',
    icon: MessageSquare,
    category: 'Notifications',
    nodes: [
      {
        id: 'trigger-1',
        type: 'Google Drive',
        position: { x: 100, y: 200 },
        data: {
          title: 'Google Drive',
          description: EditorCanvasDefaultCardTypes['Google Drive'].description,
          completed: false,
          current: false,
          metadata: {},
          type: 'Google Drive',
        },
      },
      {
        id: 'action-1',
        type: 'Slack',
        position: { x: 400, y: 200 },
        data: {
          title: 'Slack',
          description: EditorCanvasDefaultCardTypes['Slack'].description,
          completed: false,
          current: false,
          metadata: {},
          type: 'Slack',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'action-1' },
    ],
  },
  {
    id: 'drive-notion',
    name: 'Google Drive to Notion',
    description: 'Create Notion entry when Google Drive files change',
    icon: FileJson,
    category: 'Productivity',
    nodes: [
      {
        id: 'trigger-1',
        type: 'Google Drive',
        position: { x: 100, y: 200 },
        data: {
          title: 'Google Drive',
          description: EditorCanvasDefaultCardTypes['Google Drive'].description,
          completed: false,
          current: false,
          metadata: {},
          type: 'Google Drive',
        },
      },
      {
        id: 'action-1',
        type: 'Notion',
        position: { x: 400, y: 200 },
        data: {
          title: 'Notion',
          description: EditorCanvasDefaultCardTypes['Notion'].description,
          completed: false,
          current: false,
          metadata: {},
          type: 'Notion',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'action-1' },
    ],
  },
  {
    id: 'drive-multi-notify',
    name: 'Multi-Channel Notification',
    description: 'Notify both Slack and Discord when Drive files change',
    icon: Bell,
    category: 'Notifications',
    nodes: [
      {
        id: 'trigger-1',
        type: 'Google Drive',
        position: { x: 100, y: 250 },
        data: {
          title: 'Google Drive',
          description: EditorCanvasDefaultCardTypes['Google Drive'].description,
          completed: false,
          current: false,
          metadata: {},
          type: 'Google Drive',
        },
      },
      {
        id: 'action-1',
        type: 'Slack',
        position: { x: 400, y: 150 },
        data: {
          title: 'Slack',
          description: EditorCanvasDefaultCardTypes['Slack'].description,
          completed: false,
          current: false,
          metadata: {},
          type: 'Slack',
        },
      },
      {
        id: 'action-2',
        type: 'Discord',
        position: { x: 400, y: 350 },
        data: {
          title: 'Discord',
          description: EditorCanvasDefaultCardTypes['Discord'].description,
          completed: false,
          current: false,
          metadata: {},
          type: 'Discord',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'action-1' },
      { id: 'e2', source: 'trigger-1', target: 'action-2' },
    ],
  },
  {
    id: 'drive-delayed-notify',
    name: 'Delayed Notification',
    description: 'Wait before sending notification after file changes',
    icon: Clock,
    category: 'Automation',
    nodes: [
      {
        id: 'trigger-1',
        type: 'Google Drive',
        position: { x: 100, y: 200 },
        data: {
          title: 'Google Drive',
          description: EditorCanvasDefaultCardTypes['Google Drive'].description,
          completed: false,
          current: false,
          metadata: {},
          type: 'Google Drive',
        },
      },
      {
        id: 'action-1',
        type: 'Wait',
        position: { x: 350, y: 200 },
        data: {
          title: 'Wait',
          description: EditorCanvasDefaultCardTypes['Wait'].description,
          completed: false,
          current: false,
          metadata: {},
          type: 'Wait',
        },
      },
      {
        id: 'action-2',
        type: 'Discord',
        position: { x: 600, y: 200 },
        data: {
          title: 'Discord',
          description: EditorCanvasDefaultCardTypes['Discord'].description,
          completed: false,
          current: false,
          metadata: {},
          type: 'Discord',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'action-1' },
      { id: 'e2', source: 'action-1', target: 'action-2' },
    ],
  },
  {
    id: 'ai-workflow',
    name: 'AI-Powered Workflow',
    description: 'Use AI to process file changes before notifying',
    icon: Zap,
    category: 'Automation',
    nodes: [
      {
        id: 'trigger-1',
        type: 'Google Drive',
        position: { x: 100, y: 200 },
        data: {
          title: 'Google Drive',
          description: EditorCanvasDefaultCardTypes['Google Drive'].description,
          completed: false,
          current: false,
          metadata: {},
          type: 'Google Drive',
        },
      },
      {
        id: 'action-1',
        type: 'AI',
        position: { x: 350, y: 200 },
        data: {
          title: 'AI',
          description: EditorCanvasDefaultCardTypes['AI'].description,
          completed: false,
          current: false,
          metadata: {},
          type: 'AI',
        },
      },
      {
        id: 'action-2',
        type: 'Slack',
        position: { x: 600, y: 200 },
        data: {
          title: 'Slack',
          description: EditorCanvasDefaultCardTypes['Slack'].description,
          completed: false,
          current: false,
          metadata: {},
          type: 'Slack',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'action-1' },
      { id: 'e2', source: 'action-1', target: 'action-2' },
    ],
  },
]

type WorkflowTemplate = typeof workflowTemplates[0]

type Props = {
  onApplyTemplate: (template: WorkflowTemplate) => void
}

const WorkflowTemplates = ({ onApplyTemplate }: Props) => {
  const [open, setOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const categories = Array.from(new Set(workflowTemplates.map(t => t.category)))
  
  const filteredTemplates = selectedCategory
    ? workflowTemplates.filter(t => t.category === selectedCategory)
    : workflowTemplates

  const handleApply = (template: WorkflowTemplate) => {
    // Generate new unique IDs for nodes and edges
    const idMap: Record<string, string> = {}
    const newNodes = template.nodes.map(node => {
      const newId = v4()
      idMap[node.id] = newId
      return { ...node, id: newId }
    })
    
    const newEdges = template.edges.map(edge => ({
      ...edge,
      id: v4(),
      source: idMap[edge.source],
      target: idMap[edge.target],
    }))

    onApplyTemplate({
      ...template,
      nodes: newNodes,
      edges: newEdges,
    })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Workflow Templates</DialogTitle>
          <DialogDescription>
            Choose a pre-built template to get started quickly
          </DialogDescription>
        </DialogHeader>
        
        {/* Category filters */}
        <div className="flex flex-wrap gap-2 py-2">
          <Badge
            variant={selectedCategory === null ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Badge>
          {categories.map(category => (
            <Badge
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Badge>
          ))}
        </div>

        {/* Templates grid */}
        <div className="grid max-h-[50vh] grid-cols-2 gap-3 overflow-y-auto pr-2">
          {filteredTemplates.map(template => {
            const Icon = template.icon
            return (
              <Card
                key={template.id}
                className="cursor-pointer transition-all hover:shadow-md"
                onClick={() => handleApply(template)}
              >
                <CardHeader className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-neutral-100 p-2 dark:bg-neutral-800">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-sm font-medium">
                        {template.name}
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs">
                        {template.description}
                      </CardDescription>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {template.nodes.length} nodes
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {template.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default WorkflowTemplates
