'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, ExternalLink, RefreshCw, Sparkles, Grid3x3, List } from 'lucide-react'
import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface NotionPage {
  id: string
  title: string
  url: string
  lastEditedTime: string
  createdTime: string
}

interface NotionWidgetProps {
  data: {
    pages: NotionPage[]
    totalCount: number
  } | null
  error: string | null
  onRefresh?: () => void
  forceListView?: boolean
}

export function NotionWidget({ data, error, onRefresh, forceListView = false }: NotionWidgetProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(forceListView ? 'list' : 'grid')

  const handleRefresh = async () => {
    setIsRefreshing(true)
    if (onRefresh) {
      await onRefresh()
    }
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const getPageColor = (index: number) => {
    const colors = [
      'bg-purple-500/10 border-purple-500/20',
      'bg-blue-500/10 border-blue-500/20',
      'bg-green-500/10 border-green-500/20',
      'bg-orange-500/10 border-orange-500/20',
      'bg-pink-500/10 border-pink-500/20',
    ]
    return colors[index % colors.length]
  }

  if (error) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="flex-shrink-0 py-2 px-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileText className="h-3.5 w-3.5" />
            Notion
          </CardTitle>
          <CardDescription className="text-xs mt-0">Recent Pages</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 px-3 pb-2">
          <div className="text-xs text-muted-foreground">
            {error === 'Notion not connected' ? (
              <div className="space-y-1.5">
                <p>Notion is not connected</p>
                <Link href="/connections">
                  <Button variant="outline" size="sm" className="text-xs h-7">
                    Connect Notion
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
        <CardHeader className="flex-shrink-0 py-2 px-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileText className="h-3.5 w-3.5" />
            Notion
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-3 pb-2">
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const pages = data.pages || []

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-shrink-0 py-2 px-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5" />
            <CardTitle className="text-sm">Notion</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {!forceListView && (
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'list')}>
                <TabsList className="h-7">
                  <TabsTrigger value="grid" className="h-6 px-2 text-xs">
                    <Grid3x3 className="h-3 w-3" />
                  </TabsTrigger>
                  <TabsTrigger value="list" className="h-6 px-2 text-xs">
                    <List className="h-3 w-3" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
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
        <CardDescription className="text-xs mt-0">
          {pages.length} recent page{pages.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-y-auto pt-0 px-3 pb-2">
        {pages.length === 0 ? (
          <div className="text-center py-3 text-xs text-muted-foreground">
            <FileText className="h-5 w-5 mx-auto mb-1 opacity-50" />
            <p>No recent pages</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-1.5">
              {pages.slice(0, 4).map((page, index) => (
                <Link
                  key={page.id}
                  href={page.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'group relative p-2 rounded-md border transition-all hover:scale-105 hover:shadow-md hover:border-primary/50',
                    getPageColor(index)
                  )}
                >
                  <div className="flex flex-col h-full min-h-[60px]">
                    <div className="flex items-start justify-between mb-1">
                      <div className="h-5 w-5 rounded bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-3 w-3 text-purple-500" />
                      </div>
                      <ExternalLink className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-xs font-medium line-clamp-2 leading-tight mb-1">{page.title}</p>
                    <p className="text-[0.6rem] text-muted-foreground mt-auto">
                      {formatDistanceToNow(new Date(page.lastEditedTime), { addSuffix: true })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
            {data.totalCount > pages.length && (
              <Link href="https://notion.so" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="w-full text-xs h-7">
                  View All ({data.totalCount})
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {pages.slice(0, 4).map((page) => (
              <Link
                key={page.id}
                href={page.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-1.5 rounded-md hover:bg-accent/50 hover:border-primary/50 border border-transparent transition-all group"
              >
                <div className="flex-shrink-0">
                  <div className="h-6 w-6 rounded bg-purple-500/10 flex items-center justify-center">
                    <FileText className="h-3 w-3 text-purple-500" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate mb-0.5">{page.title}</p>
                  <p className="text-[0.65rem] text-muted-foreground">
                    {formatDistanceToNow(new Date(page.lastEditedTime), { addSuffix: true })}
                  </p>
                </div>
                <ExternalLink className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </Link>
            ))}
            {data.totalCount > pages.length && (
              <Link href="https://notion.so" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="w-full mt-1 text-xs h-7">
                  View All ({data.totalCount})
                </Button>
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

