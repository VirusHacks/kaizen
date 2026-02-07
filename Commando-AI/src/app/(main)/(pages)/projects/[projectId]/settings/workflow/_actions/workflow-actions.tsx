'use server'

import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { IssueStatus } from '@/lib/types'

/**
 * Helper to get current user ID
 */
const getCurrentUserId = async (): Promise<string | null> => {
  const { userId } = await auth()
  return userId
}

/**
 * Check if user has access to the project (owner check)
 */
const checkProjectOwnership = async (
  projectId: string,
  userId: string
): Promise<boolean> => {
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      ownerId: userId,
    },
  })
  return !!project
}

/**
 * Default workflow configuration
 * This defines the standard Jira-like workflow
 */
const DEFAULT_WORKFLOW_CONFIG = {
  name: 'Default Workflow',
  description: 'Standard workflow with TODO, In Progress, In Review, and Done statuses',
  statuses: [
    { status: 'TODO', displayName: 'To Do', order: 0, color: '#6B7280', positionX: 100, positionY: 200 },
    { status: 'IN_PROGRESS', displayName: 'In Progress', order: 1, color: '#3B82F6', positionX: 350, positionY: 200 },
    { status: 'IN_REVIEW', displayName: 'In Review', order: 2, color: '#EAB308', positionX: 600, positionY: 200 },
    { status: 'DONE', displayName: 'Done', order: 3, color: '#22C55E', positionX: 850, positionY: 200 },
  ],
  // Transitions: [fromStatus, toStatus, name, requiresAssignee]
  transitions: [
    // From TODO
    ['TODO', 'IN_PROGRESS', 'Start Work', false],
    ['TODO', 'DONE', 'Mark Complete', false],
    // From IN_PROGRESS
    ['IN_PROGRESS', 'TODO', 'Move to Backlog', false],
    ['IN_PROGRESS', 'IN_REVIEW', 'Request Review', true], // Requires assignee
    ['IN_PROGRESS', 'DONE', 'Mark Complete', true],
    // From IN_REVIEW
    ['IN_REVIEW', 'IN_PROGRESS', 'Request Changes', false],
    ['IN_REVIEW', 'DONE', 'Approve', false],
    ['IN_REVIEW', 'TODO', 'Reject', false],
    // From DONE
    ['DONE', 'TODO', 'Reopen', false],
    ['DONE', 'IN_PROGRESS', 'Reopen & Start', false],
  ] as [string, string, string, boolean][],
}

// ==========================================
// CREATE DEFAULT WORKFLOW
// ==========================================

/**
 * Creates a default workflow for a project
 * Called when a project is created
 */
export const createDefaultWorkflow = async (projectId: string) => {
  try {
    // Check if project already has a workflow
    const existingWorkflow = await db.projectWorkflow.findFirst({
      where: { projectId, isDefault: true },
    })

    if (existingWorkflow) {
      return { data: existingWorkflow, error: null, message: 'Default workflow already exists' }
    }

    // Create workflow first (outside transaction for Neon compatibility)
    const newWorkflow = await db.projectWorkflow.create({
      data: {
        name: DEFAULT_WORKFLOW_CONFIG.name,
        description: DEFAULT_WORKFLOW_CONFIG.description,
        isDefault: true,
        projectId,
      },
    })

    // Create all statuses in parallel
    const statusPromises = DEFAULT_WORKFLOW_CONFIG.statuses.map((statusConfig) =>
      db.workflowStatus.create({
        data: {
          status: statusConfig.status,
          displayName: statusConfig.displayName,
          order: statusConfig.order,
          color: statusConfig.color,
          positionX: statusConfig.positionX,
          positionY: statusConfig.positionY,
          workflowId: newWorkflow.id,
        },
      })
    )
    const createdStatuses = await Promise.all(statusPromises)

    // Build status map
    const statusMap: Record<string, string> = {}
    for (const status of createdStatuses) {
      statusMap[status.status] = status.id
    }

    // Create all transitions in parallel
    const transitionPromises = DEFAULT_WORKFLOW_CONFIG.transitions.map(
      ([fromStatus, toStatus, name, requiresAssignee]) =>
        db.workflowTransition.create({
          data: {
            name,
            requiresAssignee,
            workflowId: newWorkflow.id,
            fromStatusId: statusMap[fromStatus],
            toStatusId: statusMap[toStatus],
          },
        })
    )
    await Promise.all(transitionPromises)

    return { data: newWorkflow, error: null, message: 'Default workflow created' }
  } catch (error) {
    console.error('[CREATE_DEFAULT_WORKFLOW]', error)
    return { error: 'Failed to create default workflow', data: null }
  }
}

// ==========================================
// GET WORKFLOW
// ==========================================

/**
 * Get the workflow for a project (or default workflow)
 */
export const getProjectWorkflow = async (projectId: string) => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { error: 'User not authenticated', data: null }
    }

    // Get the default workflow for the project
    let workflow = await db.projectWorkflow.findFirst({
      where: { projectId, isDefault: true },
      include: {
        statuses: {
          orderBy: { order: 'asc' },
        },
        transitions: {
          include: {
            fromStatus: true,
            toStatus: true,
          },
        },
      },
    })

    // If no workflow exists, create the default one
    if (!workflow) {
      const result = await createDefaultWorkflow(projectId)
      if (result.error) {
        return { error: result.error, data: null }
      }
      
      // Fetch the newly created workflow with relations
      workflow = await db.projectWorkflow.findFirst({
        where: { projectId, isDefault: true },
        include: {
          statuses: {
            orderBy: { order: 'asc' },
          },
          transitions: {
            include: {
              fromStatus: true,
              toStatus: true,
            },
          },
        },
      })
    }

    return { data: workflow, error: null }
  } catch (error) {
    console.error('[GET_PROJECT_WORKFLOW]', error)
    return { error: 'Failed to fetch workflow', data: null }
  }
}

/**
 * Get allowed transitions for a given status in a project
 */
export const getAllowedTransitions = async (
  projectId: string,
  currentStatus: string
) => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { error: 'User not authenticated', data: null }
    }

    // Get the workflow
    const workflow = await db.projectWorkflow.findFirst({
      where: { projectId, isDefault: true },
      include: {
        statuses: true,
        transitions: {
          include: {
            fromStatus: true,
            toStatus: true,
          },
        },
      },
    })

    if (!workflow) {
      // No workflow = allow all transitions (backward compatible)
      const allStatuses: IssueStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']
      return {
        data: allStatuses.filter((s) => s !== currentStatus).map((status) => ({
          toStatus: status,
          name: null,
          requiresAssignee: false,
        })),
        error: null,
      }
    }

    // Find the current status in the workflow
    const currentWorkflowStatus = workflow.statuses.find(
      (s) => s.status === currentStatus
    )

    if (!currentWorkflowStatus) {
      return { error: 'Current status not found in workflow', data: null }
    }

    // Get allowed transitions from current status
    const allowedTransitions = workflow.transitions
      .filter((t) => t.fromStatusId === currentWorkflowStatus.id)
      .map((t) => ({
        toStatus: t.toStatus.status,
        toStatusDisplayName: t.toStatus.displayName,
        name: t.name,
        requiresAssignee: t.requiresAssignee,
        requiresComment: t.requiresComment,
      }))

    return { data: allowedTransitions, error: null }
  } catch (error) {
    console.error('[GET_ALLOWED_TRANSITIONS]', error)
    return { error: 'Failed to fetch allowed transitions', data: null }
  }
}

// ==========================================
// VALIDATE TRANSITION
// ==========================================

type ValidationResult = {
  valid: boolean
  error?: string
  transition?: {
    name: string | null
    requiresAssignee: boolean
    requiresComment: boolean
  }
}

/**
 * Validate if a status transition is allowed
 * This is the core workflow engine validation function
 */
export const validateTransition = async (
  projectId: string,
  issueId: string,
  fromStatus: string,
  toStatus: string
): Promise<ValidationResult> => {
  try {
    // Same status = no transition needed
    if (fromStatus === toStatus) {
      return { valid: true }
    }

    // Get the workflow
    const workflow = await db.projectWorkflow.findFirst({
      where: { projectId, isDefault: true },
      include: {
        statuses: true,
        transitions: {
          include: {
            fromStatus: true,
            toStatus: true,
          },
        },
      },
    })

    // No workflow = allow all (backward compatible)
    if (!workflow) {
      return { valid: true }
    }

    // Find statuses in workflow
    const fromWorkflowStatus = workflow.statuses.find((s) => s.status === fromStatus)
    const toWorkflowStatus = workflow.statuses.find((s) => s.status === toStatus)

    if (!fromWorkflowStatus || !toWorkflowStatus) {
      return { valid: false, error: 'Invalid status in workflow' }
    }

    // Find the transition
    const transition = workflow.transitions.find(
      (t) => t.fromStatusId === fromWorkflowStatus.id && t.toStatusId === toWorkflowStatus.id
    )

    if (!transition) {
      return {
        valid: false,
        error: `Transition from "${fromWorkflowStatus.displayName}" to "${toWorkflowStatus.displayName}" is not allowed`,
      }
    }

    // Check if transition requires assignee
    if (transition.requiresAssignee) {
      const issue = await db.issue.findUnique({
        where: { id: issueId },
        select: { assigneeId: true },
      })

      if (!issue?.assigneeId) {
        return {
          valid: false,
          error: `This transition requires an assignee. Please assign someone first.`,
        }
      }
    }

    return {
      valid: true,
      transition: {
        name: transition.name,
        requiresAssignee: transition.requiresAssignee,
        requiresComment: transition.requiresComment,
      },
    }
  } catch (error) {
    console.error('[VALIDATE_TRANSITION]', error)
    return { valid: false, error: 'Failed to validate transition' }
  }
}

// ==========================================
// UPDATE WORKFLOW
// ==========================================

/**
 * Add a new transition to the workflow
 */
export const addTransition = async (
  projectId: string,
  workflowId: string,
  data: {
    fromStatusId: string
    toStatusId: string
    name?: string
    requiresAssignee?: boolean
    requiresComment?: boolean
  }
) => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { error: 'User not authenticated', data: null }
    }

    // Check ownership
    const isOwner = await checkProjectOwnership(projectId, userId)
    if (!isOwner) {
      return { error: 'Only project owner can modify workflow', data: null }
    }

    // Check if transition already exists
    const existing = await db.workflowTransition.findUnique({
      where: {
        workflowId_fromStatusId_toStatusId: {
          workflowId,
          fromStatusId: data.fromStatusId,
          toStatusId: data.toStatusId,
        },
      },
    })

    if (existing) {
      return { error: 'This transition already exists', data: null }
    }

    const transition = await db.workflowTransition.create({
      data: {
        workflowId,
        fromStatusId: data.fromStatusId,
        toStatusId: data.toStatusId,
        name: data.name || null,
        requiresAssignee: data.requiresAssignee || false,
        requiresComment: data.requiresComment || false,
      },
      include: {
        fromStatus: true,
        toStatus: true,
      },
    })

    revalidatePath(`/projects/${projectId}/settings/workflow`)
    return { data: transition, error: null, message: 'Transition added' }
  } catch (error) {
    console.error('[ADD_TRANSITION]', error)
    return { error: 'Failed to add transition', data: null }
  }
}

/**
 * Remove a transition from the workflow
 */
export const removeTransition = async (
  projectId: string,
  transitionId: string
) => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { error: 'User not authenticated', data: null }
    }

    // Check ownership
    const isOwner = await checkProjectOwnership(projectId, userId)
    if (!isOwner) {
      return { error: 'Only project owner can modify workflow', data: null }
    }

    await db.workflowTransition.delete({
      where: { id: transitionId },
    })

    revalidatePath(`/projects/${projectId}/settings/workflow`)
    return { data: null, error: null, message: 'Transition removed' }
  } catch (error) {
    console.error('[REMOVE_TRANSITION]', error)
    return { error: 'Failed to remove transition', data: null }
  }
}

/**
 * Update a transition's settings
 */
export const updateTransition = async (
  projectId: string,
  transitionId: string,
  data: {
    name?: string
    requiresAssignee?: boolean
    requiresComment?: boolean
  }
) => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { error: 'User not authenticated', data: null }
    }

    // Check ownership
    const isOwner = await checkProjectOwnership(projectId, userId)
    if (!isOwner) {
      return { error: 'Only project owner can modify workflow', data: null }
    }

    const transition = await db.workflowTransition.update({
      where: { id: transitionId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.requiresAssignee !== undefined && { requiresAssignee: data.requiresAssignee }),
        ...(data.requiresComment !== undefined && { requiresComment: data.requiresComment }),
      },
      include: {
        fromStatus: true,
        toStatus: true,
      },
    })

    revalidatePath(`/projects/${projectId}/settings/workflow`)
    return { data: transition, error: null, message: 'Transition updated' }
  } catch (error) {
    console.error('[UPDATE_TRANSITION]', error)
    return { error: 'Failed to update transition', data: null }
  }
}

/**
 * Reset workflow to default configuration
 */
export const resetWorkflowToDefault = async (projectId: string) => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { error: 'User not authenticated', data: null }
    }

    // Check ownership
    const isOwner = await checkProjectOwnership(projectId, userId)
    if (!isOwner) {
      return { error: 'Only project owner can reset workflow', data: null }
    }

    // Delete existing workflow and recreate
    await db.projectWorkflow.deleteMany({
      where: { projectId, isDefault: true },
    })

    const result = await createDefaultWorkflow(projectId)

    revalidatePath(`/projects/${projectId}/settings/workflow`)
    return result
  } catch (error) {
    console.error('[RESET_WORKFLOW]', error)
    return { error: 'Failed to reset workflow', data: null }
  }
}

/**
 * Update workflow status display settings
 */
export const updateWorkflowStatus = async (
  projectId: string,
  statusId: string,
  data: {
    displayName?: string
    color?: string
    positionX?: number
    positionY?: number
  }
) => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { error: 'User not authenticated', data: null }
    }

    // Check ownership
    const isOwner = await checkProjectOwnership(projectId, userId)
    if (!isOwner) {
      return { error: 'Only project owner can modify workflow', data: null }
    }

    const status = await db.workflowStatus.update({
      where: { id: statusId },
      data: {
        ...(data.displayName && { displayName: data.displayName }),
        ...(data.color && { color: data.color }),
        ...(data.positionX !== undefined && { positionX: data.positionX }),
        ...(data.positionY !== undefined && { positionY: data.positionY }),
      },
    })

    revalidatePath(`/projects/${projectId}/settings/workflow`)
    return { data: status, error: null, message: 'Status updated' }
  } catch (error) {
    console.error('[UPDATE_WORKFLOW_STATUS]', error)
    return { error: 'Failed to update status', data: null }
  }
}

/**
 * Update node positions for React Flow editor
 * Batch update for performance when dragging nodes
 */
export const updateNodePositions = async (
  projectId: string,
  positions: { id: string; x: number; y: number }[]
) => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { error: 'User not authenticated', data: null }
    }

    // Check ownership
    const isOwner = await checkProjectOwnership(projectId, userId)
    if (!isOwner) {
      return { error: 'Only project owner can modify workflow', data: null }
    }

    // Update all positions in parallel
    await Promise.all(
      positions.map((pos) =>
        db.workflowStatus.update({
          where: { id: pos.id },
          data: {
            positionX: pos.x,
            positionY: pos.y,
          },
        })
      )
    )

    return { data: null, error: null, message: 'Positions updated' }
  } catch (error) {
    console.error('[UPDATE_NODE_POSITIONS]', error)
    return { error: 'Failed to update positions', data: null }
  }
}
