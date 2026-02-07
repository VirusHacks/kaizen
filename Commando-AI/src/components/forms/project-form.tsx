'use client'

import { ProjectFormSchema } from '@/lib/types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '../ui/form'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createProject, updateProject } from '@/app/(main)/(pages)/projects/_actions/project-actions'
import { useModal } from '@/providers/modal-provider'

type Props = {
  title?: string
  subTitle?: string
  defaultValues?: {
    id?: string
    name?: string
    key?: string
    description?: string
  }
  mode?: 'create' | 'edit'
}

const ProjectForm = ({ subTitle, title, defaultValues, mode = 'create' }: Props) => {
  const { setClose } = useModal()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  
  const form = useForm<z.infer<typeof ProjectFormSchema>>({
    mode: 'onChange',
    resolver: zodResolver(ProjectFormSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      key: defaultValues?.key || '',
      description: defaultValues?.description || '',
    },
  })

  const isLoading = form.formState.isLoading || isSubmitting
  const router = useRouter()

  // Auto-generate key from name
  const handleNameChange = (value: string) => {
    if (mode === 'create' && !form.getFieldState('key').isDirty) {
      const generatedKey = value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 10)
      form.setValue('key', generatedKey)
    }
  }

  const handleSubmit = async (values: z.infer<typeof ProjectFormSchema>) => {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      if (mode === 'edit' && defaultValues?.id) {
        const result = await updateProject(defaultValues.id, values)
        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success(result.message || 'Project updated')
          router.refresh()
          setClose()
        }
      } else {
        const result = await createProject(values)
        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success(result.message || 'Project created')
          router.refresh()
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="My Project"
                      onChange={(e) => {
                        field.onChange(e)
                        handleNameChange(e.target.value)
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              disabled={isLoading || mode === 'edit'}
              control={form.control}
              name="key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Key</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="PROJ"
                      onChange={(e) => {
                        field.onChange(e.target.value.toUpperCase())
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    A unique identifier for your project (e.g., PROJ, TASK)
                  </FormDescription>
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
                      placeholder="Describe what this project is about..."
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              className="mt-4"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === 'edit' ? 'Updating...' : 'Creating...'}
                </>
              ) : mode === 'edit' ? (
                'Update Project'
              ) : (
                'Create Project'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

export default ProjectForm
