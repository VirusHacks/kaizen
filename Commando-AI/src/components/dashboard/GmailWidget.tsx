'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, ExternalLink, RefreshCw, Inbox, Star, AlertCircle, Search, Paperclip, Bot } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { GmailAIModal } from './GmailAIModal'

interface Email {
  id: string
  threadId: string
  subject: string
  from: string
  snippet: string
  date: string
  isUnread: boolean
}

interface GmailWidgetProps {
  data: {
    emails: Email[]
    unreadCount: number
  } | null
  error: string | null
  onRefresh?: () => void
}

export function GmailWidget({ data, error, onRefresh }: GmailWidgetProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread' | 'important' | 'starred'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [starredEmails, setStarredEmails] = useState<Set<string>>(new Set())
  const [isAIModalOpen, setIsAIModalOpen] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    if (onRefresh) {
      await onRefresh()
    }
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  // Filter emails based on selected filter and search
  const filteredEmails = useMemo(() => {
    if (!data?.emails) return []
    
    let filtered = data.emails
    
    // Apply filter
    switch (filter) {
      case 'important':
        filtered = filtered.filter((email) => email.isUnread || email.subject.toLowerCase().includes('important'))
        break
      case 'unread':
        filtered = filtered.filter((email) => email.isUnread)
        break
      case 'starred':
        // You can add starred logic if you have that data
        filtered = filtered.filter((email) => email.isUnread)
        break
      default:
        break
    }
    
    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (email) =>
          email.subject.toLowerCase().includes(query) ||
          email.from.toLowerCase().includes(query) ||
          email.snippet.toLowerCase().includes(query)
      )
    }
    
    return filtered
  }, [data?.emails, filter, searchQuery])

  if (error) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="flex-shrink-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />
            Gmail
          </CardTitle>
          <CardDescription className="text-xs mt-1">Email management</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pt-0">
          <div className="text-xs text-muted-foreground">
            {error === 'Google not connected' ? (
              <div className="space-y-1.5">
                <p>Gmail is not connected</p>
                <Link href="/connections">
                  <Button variant="outline" size="sm" className="text-xs h-7">
                    Connect Gmail
                  </Button>
                </Link>
              </div>
            ) : (
              <p>{error}</p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="flex-shrink-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />
            Gmail
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 pt-0">
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const emails = data.emails || []
  const unreadCount = data.unreadCount || 0

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-shrink-0 py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <CardTitle className="text-base">Gmail</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-1.5 text-xs px-1.5 py-0 h-5 rounded-full">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsAIModalOpen(true)}
              className="h-7 w-7"
              title="AI Assistant"
            >
              <Bot className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-7 w-7"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <CardDescription className="text-sm mt-0.5">Inbox</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto pt-0 px-4 pb-3">
        {/* Search Bar */}
        <div className="mb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-9 text-xs"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="mb-2">
          <TabsList className="h-8 w-full grid grid-cols-4">
            <TabsTrigger value="all" className="h-6 px-2 text-xs">
              All
            </TabsTrigger>
            <TabsTrigger value="unread" className="h-6 px-2 text-xs">
              Unread
            </TabsTrigger>
            <TabsTrigger value="important" className="h-6 px-2 text-xs">
              Important
            </TabsTrigger>
            <TabsTrigger value="starred" className="h-6 px-2 text-xs">
              Starred
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {filteredEmails.length === 0 ? (
          <div className="text-center py-4 text-xs text-muted-foreground">
            <Mail className="h-6 w-6 mx-auto mb-1 opacity-50" />
            <p>No emails found</p>
          </div>
        ) : (
          <div className="space-y-0">
            {filteredEmails.slice(0, 5).map((email) => {
              // Extract name from email address
              const fromName = email.from.split('<')[0].trim() || email.from.split('@')[0]
              const fromEmail = email.from.match(/<(.+)>/)?.[1] || email.from

              return (
                <Link
                  key={email.id}
                  href={`https://mail.google.com/mail/u/0/#inbox/${email.threadId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 py-2.5 px-2 border-b border-border/40 hover:bg-accent/30 transition-colors group"
                >
                  {/* Checkbox */}
                  <div className="flex-shrink-0">
                    <Checkbox className="h-4 w-4" />
                  </div>
                  {/* Star Icon */}
                  <div 
                    className="flex-shrink-0 cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setStarredEmails(prev => {
                        const newSet = new Set(prev)
                        if (newSet.has(email.id)) {
                          newSet.delete(email.id)
                        } else {
                          newSet.add(email.id)
                        }
                        return newSet
                      })
                    }}
                  >
                    <Star 
                      className={cn(
                        "h-4 w-4 transition-colors",
                        starredEmails.has(email.id) 
                          ? "text-yellow-500 fill-yellow-500" 
                          : "text-muted-foreground hover:text-yellow-500"
                      )} 
                    />
                  </div>
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-semibold text-primary">
                        {fromName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  {/* Email Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{fromName}</p>
                      {email.isUnread && (
                        <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm truncate">{email.subject || '(No Subject)'}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{email.snippet}</p>
                  </div>
                  {/* Right Side: Timestamp and Icons */}
                  <div className="flex-shrink-0 flex items-center gap-2">
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(email.date), { addSuffix: true })}
                    </p>
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              )
            })}
            {filteredEmails.length > 5 && (
              <div className="pt-2">
                <Link href="https://mail.google.com" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="w-full text-xs h-7">
                    View All Emails
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <GmailAIModal
        open={isAIModalOpen}
        onOpenChange={setIsAIModalOpen}
        emails={emails}
        onEmailSent={onRefresh}
      />
    </Card>
  )
}

