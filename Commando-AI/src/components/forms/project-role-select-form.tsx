'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, User, Lock, Briefcase } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useModal } from '@/providers/modal-provider'

const formSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required'),
  password: z.string().min(1, 'Password is required'),
  departmentRole: z.enum([
    'DEVELOPER',
    'QA_TESTER',
    'FINANCE',
    'SALES',
    'EXECUTIVE',
    'PROJECT_MANAGER',
  ], {
    required_error: 'Please select a role',
  }),
})

type FormValues = z.infer<typeof formSchema>

type Props = {
  projectId: string
}

const ROLE_LABELS = {
  DEVELOPER: 'Developer',
  QA_TESTER: 'QA Tester',
  FINANCE: 'Finance',
  SALES: 'Sales',
  EXECUTIVE: 'Executive',
  PROJECT_MANAGER: 'Project Manager',
}

const ROLE_ROUTES = {
  DEVELOPER: 'developer',
  QA_TESTER: 'qa-tester',
  FINANCE: 'finance',
  SALES: 'sales',
  EXECUTIVE: 'executives',
  PROJECT_MANAGER: 'project-manager',
}

const ProjectRoleSelectForm = ({ projectId }: Props) => {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { setClose } = useModal()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      memberId: '',
      password: '',
      departmentRole: undefined,
    },
  })

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/projects/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          memberId: values.memberId,
          password: values.password,
          departmentRole: values.departmentRole,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Access denied')
        return
      }

      toast.success('Access granted! Redirecting...')
      setClose()

      // Navigate to the appropriate role dashboard
      const roleRoute = ROLE_ROUTES[values.departmentRole]
      router.push(`/projects/${projectId}/${roleRoute}`)
    } catch (error) {
      console.error('Error accessing project:', error)
      toast.error('Failed to access project')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="memberId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Member ID</FormLabel>
                <FormControl>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Enter your member ID"
                      className="pl-10"
                      {...field}
                      disabled={isLoading}
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  Your unique project member identifier
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      className="pl-10"
                      {...field}
                      disabled={isLoading}
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  Your project access password
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="departmentRole"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department Role</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isLoading}
                >
                  <FormControl>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                      <SelectTrigger className="pl-10">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                    </div>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Choose the role you want to access this project as
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setClose()}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Access Project'
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default ProjectRoleSelectForm
