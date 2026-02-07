import { ConnectionProviderProps } from '@/providers/connections-provider'
import { z } from 'zod'

export const EditUserProfileSchema = z.object({
  email: z.string().email('Required'),
  name: z.string().min(1, 'Required'),
})

export const WorkflowFormSchema = z.object({
  name: z.string().min(1, 'Required'),
  description: z.string().min(1, 'Required'),
})

export const ProjectFormSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  key: z
    .string()
    .min(2, 'Key must be at least 2 characters')
    .max(10, 'Key must be at most 10 characters')
    .regex(/^[A-Z0-9]+$/, 'Key must be uppercase letters and numbers only'),
  description: z.string().optional(),
})

// Issue Types matching Prisma enums
export const IssueTypeEnum = z.enum(['EPIC', 'STORY', 'TASK', 'BUG', 'SUBTASK'])
export const IssueStatusEnum = z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'])
export const IssuePriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])

export type IssueType = z.infer<typeof IssueTypeEnum>
export type IssueStatus = z.infer<typeof IssueStatusEnum>
export type IssuePriority = z.infer<typeof IssuePriorityEnum>

export const IssueFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
  description: z.string().optional(),
  type: IssueTypeEnum.default('TASK'),
  status: IssueStatusEnum.default('TODO'),
  priority: IssuePriorityEnum.default('MEDIUM'),
  assigneeId: z.string().optional().nullable(),
  startDate: z.date().optional().nullable(),
  dueDate: z.date().optional().nullable(),
  parentId: z.string().optional().nullable(),
})

export const UpdateIssueSchema = IssueFormSchema.partial()

export const ChangeIssueStatusSchema = z.object({
  issueId: z.string().uuid(),
  status: IssueStatusEnum,
})

export const AssignIssueSchema = z.object({
  issueId: z.string().uuid(),
  assigneeId: z.string().nullable(),
})

// Sprint Types matching Prisma enums
export const SprintStatusEnum = z.enum(['PLANNED', 'ACTIVE', 'COMPLETED'])
export type SprintStatus = z.infer<typeof SprintStatusEnum>

export const SprintFormSchema = z.object({
  name: z.string().min(1, 'Sprint name is required').max(100, 'Name is too long'),
  goal: z.string().optional(),
  startDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable(),
})

export const UpdateSprintSchema = SprintFormSchema.partial()

export type ConnectionTypes = 'Google Drive' | 'Google Calendar' | 'Gmail' | 'Notion' | 'Slack' | 'Discord'

export type Connection = {
  title: ConnectionTypes
  description: string
  image: string
  connectionKey: keyof ConnectionProviderProps
  accessTokenKey?: string
  alwaysTrue?: boolean
  slackSpecial?: boolean
}

export type EditorCanvasTypes =
  | 'Email'
  | 'Condition'
  | 'AI'
  | 'Slack'
  | 'Google Drive'
  | 'Notion'
  | 'Custom Webhook'
  | 'Google Calendar'
  | 'Gmail Read'
  | 'Gmail Send'
  | 'Trigger'
  | 'Action'
  | 'Wait'
  | 'Discord'
  | 'HTTP Request'
  | 'Schedule Trigger'
  | 'Text Formatter'
  | 'Data Filter'
  | 'Code'

export type EditorCanvasCardType = {
  title: string
  description: string
  completed: boolean
  current: boolean
  metadata: any
  type: EditorCanvasTypes
}

export type EditorNodeType = {
  id: string
  type: EditorCanvasCardType['type']
  position: {
    x: number
    y: number
  }
  data: EditorCanvasCardType
}

export type EditorNode = EditorNodeType

export type EditorActions =
  | {
      type: 'LOAD_DATA'
      payload: {
        elements: EditorNode[]
        edges: {
          id: string
          source: string
          target: string
        }[]
      }
    }
  | {
      type: 'UPDATE_NODE'
      payload: {
        elements: EditorNode[]
      }
    }
  | { type: 'REDO' }
  | { type: 'UNDO' }
  | {
      type: 'SELECTED_ELEMENT'
      payload: {
        element: EditorNode
      }
    }

export const nodeMapper: Record<string, string> = {
  Notion: 'notionNode',
  Slack: 'slackNode',
  Discord: 'discordNode',
  'Google Drive': 'googleNode',
  'Google Calendar': 'googleCalendarNode',
  'Gmail Read': 'gmailNode',
  'Gmail Send': 'gmailNode',
}
