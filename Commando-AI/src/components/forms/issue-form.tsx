'use client'

import { IssueFormSchema, IssueType, IssueStatus, IssuePriority } from '@/lib/types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { format } from 'date-fns'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/Calendar'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Loader2, Bug, Zap, BookOpen, CheckSquare, Layers, CalendarIcon } from 'lucide-react'
import { toast } from 'sonner'
import { createIssue, updateIssue } from '@/app/(main)/(pages)/projects/[projectId]/issues/_actions/issue-actions'
import { useModal } from '@/providers/modal-provider'
import { cn } from '@/lib/utils'

const issueTypeIcons: Record<IssueType, React.ReactNode> = {
  EPIC: <Zap className="h-4 w-4 text-purple-500" />,
  STORY: <BookOpen className="h-4 w-4 text-green-500" />,
  TASK: <CheckSquare className="h-4 w-4 text-blue-500" />,
  BUG: <Bug className="h-4 w-4 text-red-500" />,
  SUBTASK: <Layers className="h-4 w-4 text-gray-500" />,
}

const issueTypeLabels: Record<IssueType, string> = {
  EPIC: 'Epic',
  STORY: 'Story',
  TASK: 'Task',
  BUG: 'Bug',
  SUBTASK: 'Subtask',
}

const issueStatusLabels: Record<IssueStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
}

const issuePriorityLabels: Record<IssuePriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
}

type Props = {
  projectId: string
  title?: string
  subTitle?: string
  defaultValues?: {
    id?: string
    title?: string
    description?: string
    type?: IssueType
    status?: IssueStatus
    priority?: IssuePriority
    assigneeId?: string | null
    parentId?: string | null
    startDate?: Date | null
    dueDate?: Date | null
  }
  mode?: 'create' | 'edit'
  onSuccess?: () => void
}

const IssueForm = ({
  projectId,
  subTitle,
  title,
  defaultValues,
  mode = 'create',
  onSuccess,
}: Props) => {
  const { setClose } = useModal()
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<z.infer<typeof IssueFormSchema>>({
    mode: 'onChange',
    resolver: zodResolver(IssueFormSchema),
    defaultValues: {
      title: defaultValues?.title || '',
      description: defaultValues?.description || '',
      type: defaultValues?.type || 'TASK',
      status: defaultValues?.status || 'TODO',
      priority: defaultValues?.priority || 'MEDIUM',
      assigneeId: defaultValues?.assigneeId || null,
      parentId: defaultValues?.parentId || null,
      startDate: defaultValues?.startDate || null,
      dueDate: defaultValues?.dueDate || null,
    },
  })

  const isLoading = form.formState.isLoading || isSubmitting
  const router = useRouter()

  const handleSubmit = async (values: z.infer<typeof IssueFormSchema>) => {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      if (mode === 'edit' && defaultValues?.id) {
        const result = await updateIssue(defaultValues.id, values)
        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success(result.message || 'Issue updated')
          router.refresh()
          onSuccess?.()
          setClose()
        }
      } else {
        const result = await createIssue(projectId, values)
        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success(result.message || 'Issue created')
          router.refresh()
          onSuccess?.()
          setClose()
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-[650px] border-none">
      {title && subTitle && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{subTitle}</CardDescription>
        </CardHeader>
      )}
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col gap-4 text-left"
          >
            <FormField
              disabled={isLoading}
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="What needs to be done?" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              disabled={isLoading}
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Add more details..."
                      rows={4}
                    />
                  </FormControl>
                  <FormDescription>
                    Supports markdown formatting
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                disabled={isLoading}
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      disabled={isLoading}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(issueTypeLabels) as IssueType[]).map((type) => (
                          <SelectItem key={type} value={type}>
                            <div className="flex items-center gap-2">
                              {issueTypeIcons[type]}
                              {issueTypeLabels[type]}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                disabled={isLoading}
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select
                      disabled={isLoading}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(issuePriorityLabels) as IssuePriority[]).map(
                          (priority) => (
                            <SelectItem key={priority} value={priority}>
                              {issuePriorityLabels[priority]}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                disabled={isLoading}
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      disabled={isLoading}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(issueStatusLabels) as IssueStatus[]).map(
                          (status) => (
                            <SelectItem key={status} value={status}>
                              {issueStatusLabels[status]}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Date Fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                disabled={isLoading}
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date (optional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={isLoading}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a start date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          initialFocus
                        />
                        {field.value && (
                          <div className="p-2 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full"
                              onClick={() => field.onChange(null)}
                            >
                              Clear date
                            </Button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                disabled={isLoading}
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date (optional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={isLoading}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a due date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          initialFocus
                        />
                        {field.value && (
                          <div className="p-2 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full"
                              onClick={() => field.onChange(null)}
                            >
                              Clear date
                            </Button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button className="mt-4" disabled={isLoading} type="submit">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === 'edit' ? 'Updating...' : 'Creating...'}
                </>
              ) : mode === 'edit' ? (
                'Update Issue'
              ) : (
                'Create Issue'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

export default IssueForm
