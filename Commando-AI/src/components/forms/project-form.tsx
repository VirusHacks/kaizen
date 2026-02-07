'use client'

import { ProjectFormSchema } from '@/lib/types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'
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
import { Separator } from '../ui/separator'
import { Badge } from '../ui/badge'
import {
  Loader2,
  GitBranch,
  Plus,
  Link as LinkIcon,
  Calendar,
  Users,
  Code2,
  Target,
  Bot,
  FolderGit2,
  Globe,
  Lock,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { createProject, updateProject } from '@/app/(main)/(pages)/projects/_actions/project-actions'
import { useModal } from '@/providers/modal-provider'
import { cn } from '@/lib/utils'

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
  isGitHubConnected?: boolean
}

type FormValues = z.infer<typeof ProjectFormSchema>

const ProjectForm = ({ subTitle, title, defaultValues, mode = 'create', isGitHubConnected = false }: Props) => {
  const { setClose } = useModal()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    mode: 'onChange',
    resolver: zodResolver(ProjectFormSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      key: defaultValues?.key || '',
      description: defaultValues?.description || '',
      startDate: '',
      endDate: '',
      teamSize: '' as unknown as number,
      techStack: '',
      vision: '',
      aiInstructions: '',
      githubOption: 'none',
      githubRepoName: '',
      githubRepoVisibility: 'private',
      githubRepoUrl: '',
    },
  })

  const isLoading = form.formState.isLoading || isSubmitting
  const router = useRouter()
  const githubOption = form.watch('githubOption')
  const projectName = form.watch('name')

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

  // Auto-fill repo name from project name
  useEffect(() => {
    if (githubOption === 'create' && projectName) {
      const repoName = projectName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 100)
      form.setValue('githubRepoName', repoName)
    }
  }, [githubOption, projectName, form])

  const handleSubmit = async (values: FormValues) => {
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
    <Card className="w-full max-w-[700px] border-none max-h-[80vh] overflow-y-auto">
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
            className="flex flex-col gap-6 text-left"
          >
            {/* ===== Section A: Basic Info ===== */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FolderGit2 className="h-4 w-4" />
                Project Details
              </div>

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
                        placeholder="My Awesome Project"
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
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Briefly describe what this project is about..."
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Timeline */}
              {mode === 'create' && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    disabled={isLoading}
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          Start Date
                        </FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    disabled={isLoading}
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          End Date
                        </FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Team Size */}
              {mode === 'create' && (
                <FormField
                  disabled={isLoading}
                  control={form.control}
                  name="teamSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        Team Size
                        <span className="text-muted-foreground font-normal">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          placeholder="e.g. 5"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* ===== Section B: Technical Context ===== */}
            {mode === 'create' && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Code2 className="h-4 w-4" />
                    Technical Context
                  </div>

                  <FormField
                    disabled={isLoading}
                    control={form.control}
                    name="techStack"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <Code2 className="h-3.5 w-3.5" />
                          Tech Stack
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder={`e.g.\nNext.js 15\nTypeScript\nPrisma + PostgreSQL\nTailwind CSS`}
                            rows={4}
                          />
                        </FormControl>
                        <FormDescription>
                          List the technologies, frameworks, and tools used
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    disabled={isLoading}
                    control={form.control}
                    name="vision"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5" />
                          Project Goal / Vision
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="What is the main goal of this project? What problem does it solve?"
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    disabled={isLoading}
                    control={form.control}
                    name="aiInstructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <Bot className="h-3.5 w-3.5" />
                          Additional Instructions for AI
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Any specific instructions, constraints, or preferences for AI assistance..."
                            rows={3}
                          />
                        </FormControl>
                        <FormDescription>
                          These instructions help the AI better understand your project context
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {/* ===== Section C: GitHub Integration ===== */}
            {mode === 'create' && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <GitBranch className="h-4 w-4" />
                      GitHub Integration
                    </div>
                    {isGitHubConnected ? (
                      <Badge variant="outline" className="text-green-500 border-green-500/30 text-xs">
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-yellow-500 border-yellow-500/30 text-xs">
                        Not Connected
                      </Badge>
                    )}
                  </div>

                  {!isGitHubConnected && (
                    <div className="flex items-start gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-sm text-yellow-500">
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <p>
                        Connect your GitHub account in{' '}
                        <a href="/connections" className="underline font-medium hover:text-yellow-400">
                          Connections
                        </a>{' '}
                        to enable repository integration.
                      </p>
                    </div>
                  )}

                  {isGitHubConnected && (
                    <>
                      {/* GitHub option selector */}
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: 'none', label: 'Skip', icon: null },
                          { value: 'create', label: 'Create New Repo', icon: Plus },
                          { value: 'connect', label: 'Connect Existing', icon: LinkIcon },
                        ].map((option) => {
                          const isActive = githubOption === option.value
                          return (
                            <button
                              key={option.value}
                              type="button"
                              disabled={isLoading}
                              onClick={() => form.setValue('githubOption', option.value as FormValues['githubOption'])}
                              className={cn(
                                'flex flex-col items-center gap-1.5 rounded-lg border p-3 text-sm transition-all cursor-pointer',
                                isActive
                                  ? 'border-primary bg-primary/5 text-primary'
                                  : 'border-border hover:border-muted-foreground/50 text-muted-foreground'
                              )}
                            >
                              {option.icon && <option.icon className="h-4 w-4" />}
                              {option.label}
                            </button>
                          )
                        })}
                      </div>

                      {/* Create New Repo Fields */}
                      {githubOption === 'create' && (
                        <div className="space-y-4 rounded-lg border border-border/50 bg-muted/30 p-4">
                          <FormField
                            disabled={isLoading}
                            control={form.control}
                            name="githubRepoName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Repository Name</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="my-awesome-project"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            disabled={isLoading}
                            control={form.control}
                            name="githubRepoVisibility"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Visibility</FormLabel>
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    onClick={() => form.setValue('githubRepoVisibility', 'public')}
                                    className={cn(
                                      'flex items-center gap-2 rounded-lg border p-3 text-sm transition-all cursor-pointer',
                                      field.value === 'public'
                                        ? 'border-primary bg-primary/5 text-primary'
                                        : 'border-border hover:border-muted-foreground/50 text-muted-foreground'
                                    )}
                                  >
                                    <Globe className="h-4 w-4" />
                                    Public
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => form.setValue('githubRepoVisibility', 'private')}
                                    className={cn(
                                      'flex items-center gap-2 rounded-lg border p-3 text-sm transition-all cursor-pointer',
                                      field.value === 'private'
                                        ? 'border-primary bg-primary/5 text-primary'
                                        : 'border-border hover:border-muted-foreground/50 text-muted-foreground'
                                    )}
                                  >
                                    <Lock className="h-4 w-4" />
                                    Private
                                  </button>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

                      {/* Connect Existing Repo Fields */}
                      {githubOption === 'connect' && (
                        <div className="space-y-4 rounded-lg border border-border/50 bg-muted/30 p-4">
                          <FormField
                            disabled={isLoading}
                            control={form.control}
                            name="githubRepoUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>GitHub Repository URL</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="https://github.com/username/repo"
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Paste the full URL of your existing GitHub repository
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}

            {/* ===== Submit ===== */}
            <Button
              className="mt-2"
              disabled={isLoading}
              type="submit"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === 'edit' ? 'Updating...' : 'Creating Project...'}
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
