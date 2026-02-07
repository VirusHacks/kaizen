'use client'

import React, { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { SprintFormSchema } from '@/lib/types'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/Calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, addDays, addWeeks } from 'date-fns'
import { createSprint, updateSprint } from '../../sprints/_actions/sprint-actions'
import { toast } from 'sonner'

type SprintFormValues = z.infer<typeof SprintFormSchema>

type Sprint = {
  id: string
  name: string
  goal: string | null
  startDate: Date | null
  endDate: Date | null
}

type Props = {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  sprint?: Sprint | null
  onSuccess?: () => void
}

const SprintForm = ({ projectId, open, onOpenChange, sprint, onSuccess }: Props) => {
  const [isPending, startTransition] = useTransition()
  const isEditing = !!sprint

  const form = useForm<SprintFormValues>({
    resolver: zodResolver(SprintFormSchema),
    defaultValues: {
      name: sprint?.name || '',
      goal: sprint?.goal || '',
      startDate: sprint?.startDate ? new Date(sprint.startDate) : undefined,
      endDate: sprint?.endDate ? new Date(sprint.endDate) : undefined,
    },
  })

  // Reset form when sprint changes
  React.useEffect(() => {
    if (open) {
      form.reset({
        name: sprint?.name || '',
        goal: sprint?.goal || '',
        startDate: sprint?.startDate ? new Date(sprint.startDate) : undefined,
        endDate: sprint?.endDate ? new Date(sprint.endDate) : undefined,
      })
    }
  }, [open, sprint, form])

  const onSubmit = (values: SprintFormValues) => {
    startTransition(async () => {
      const result = isEditing
        ? await updateSprint(sprint.id, values)
        : await createSprint(projectId, values)

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(isEditing ? 'Sprint updated' : 'Sprint created')
      form.reset()
      onOpenChange(false)
      onSuccess?.()
    })
  }

  // Quick date setters
  const setQuickDates = (weeks: number) => {
    const start = new Date()
    const end = addWeeks(start, weeks)
    form.setValue('startDate', start)
    form.setValue('endDate', end)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Sprint' : 'Create Sprint'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the sprint details.'
              : 'Create a new sprint for this project. Add issues to plan your work.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sprint Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Sprint 1, January Sprint"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="goal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sprint Goal</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What do you want to achieve in this sprint?"
                      className="resize-none"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    A brief description of the sprint&apos;s objective.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ?? undefined}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ?? undefined}
                          onSelect={field.onChange}
                          disabled={(date) => {
                            const startDate = form.getValues('startDate')
                            return startDate ? date < startDate : false
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Quick date presets */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Quick set:</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickDates(1)}
              >
                1 week
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickDates(2)}
              >
                2 weeks
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickDates(3)}
              >
                3 weeks
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickDates(4)}
              >
                4 weeks
              </Button>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Save Changes' : 'Create Sprint'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default SprintForm
