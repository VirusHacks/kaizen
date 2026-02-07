'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Mail,
  FileText,
  Plus,
  CheckCircle2,
} from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const quickActions = [
  {
    label: 'New Project',
    icon: Plus,
    color: 'text-blue-500 bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20',
    href: '/workflows',
    external: false,
  },
  {
    label: 'Create Document',
    icon: FileText,
    color: 'text-green-500 bg-green-500/10 hover:bg-green-500/20 border-green-500/20',
    href: 'https://docs.google.com/document/create',
    external: true,
  },
  {
    label: 'Start Task',
    icon: CheckCircle2,
    color: 'text-orange-500 bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/20',
    href: 'https://notion.so',
    external: true,
  },
  {
    label: 'Send Message',
    icon: Mail,
    color: 'text-purple-500 bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20',
    href: 'https://mail.google.com/mail/u/0/#compose',
    external: true,
  },
]

export function QuickActions() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-shrink-0 py-3 px-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Quick Actions
        </CardTitle>
        <CardDescription className="text-sm mt-0.5">One-click actions</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pt-0 px-4 pb-3">
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action, index) => {
            const Icon = action.icon
            const content = (
              <div
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={cn(
                  'flex flex-col items-center justify-center py-4 px-3 rounded-lg border transition-all cursor-pointer',
                  action.color,
                  hoveredIndex === index && 'scale-[1.02] shadow-sm'
                )}
              >
                <Icon className="h-5 w-5 mb-1.5 transition-transform" />
                <span className="text-sm font-medium text-center leading-tight">{action.label}</span>
              </div>
            )

            if (action.external) {
              return (
                <Link key={action.label} href={action.href} target="_blank" rel="noopener noreferrer" className="block">
                  {content}
                </Link>
              )
            }

            return (
              <Link key={action.label} href={action.href} className="block">
                {content}
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

