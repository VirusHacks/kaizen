'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FolderOpen, ExternalLink, RefreshCw, File, Grid3x3, List, HardDrive, Bot } from 'lucide-react'
import { useState, useMemo } from 'react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { DriveAIModal } from './DriveAIModal'

interface DriveFile {
  id: string
  name: string
  mimeType: string
  iconLink: string
  webViewLink: string
  createdTime: string
  modifiedTime: string
  size: string
}

interface DriveWidgetProps {
  data: {
    files: DriveFile[]
    totalCount: number
  } | null
  error: string | null
  onRefresh?: () => void
}

export function DriveWidget({ data, error, onRefresh }: DriveWidgetProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isAIModalOpen, setIsAIModalOpen] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    if (onRefresh) {
      await onRefresh()
    }
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  // Calculate file type distribution
  const fileTypeStats = useMemo(() => {
    if (!data?.files) return { total: 0, types: {} }
    
    const types: Record<string, number> = {}
    let totalSize = 0
    
    data.files.forEach((file) => {
      const size = parseInt(file.size) || 0
      totalSize += size
      
      if (file.mimeType.includes('folder')) {
        types['Folder'] = (types['Folder'] || 0) + 1
      } else if (file.mimeType.includes('image')) {
        types['Image'] = (types['Image'] || 0) + 1
      } else if (file.mimeType.includes('pdf')) {
        types['PDF'] = (types['PDF'] || 0) + 1
      } else if (file.mimeType.includes('document') || file.mimeType.includes('word')) {
        types['Document'] = (types['Document'] || 0) + 1
      } else if (file.mimeType.includes('spreadsheet') || file.mimeType.includes('excel')) {
        types['Spreadsheet'] = (types['Spreadsheet'] || 0) + 1
      } else {
        types['Other'] = (types['Other'] || 0) + 1
      }
    })
    
    return { total: totalSize, types, fileCount: data.files.length }
  }, [data?.files])

  const formatFileSize = (bytes: string) => {
    const size = parseInt(bytes)
    if (size === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(size) / Math.log(k))
    return Math.round(size / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('folder')) return <FolderOpen className="h-4 w-4" />
    if (mimeType.includes('image')) return <File className="h-4 w-4 text-blue-500" />
    if (mimeType.includes('pdf')) return <File className="h-4 w-4 text-red-500" />
    if (mimeType.includes('document') || mimeType.includes('word')) return <File className="h-4 w-4 text-blue-600" />
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <File className="h-4 w-4 text-green-600" />
    return <File className="h-4 w-4" />
  }

  if (error) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="flex-shrink-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderOpen className="h-4 w-4" />
            Google Drive
          </CardTitle>
          <CardDescription className="text-xs mt-1">Recent Files</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pt-0">
          <div className="text-xs text-muted-foreground">
            {error === 'Google not connected' ? (
              <div className="space-y-1.5">
                <p>Google Drive is not connected</p>
                <Link href="/connections">
                  <Button variant="outline" size="sm" className="text-xs h-7">
                    Connect Drive
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
            <FolderOpen className="h-4 w-4" />
            Google Drive
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

  const files = data.files || []

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-shrink-0 py-3 px-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="h-5 w-5">
                  <path
                    fill="#4285F4"
                    d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 2v20c5.16-1.26 9-6.45 9-12V7l-9-5z"
                  />
                  <path
                    fill="#FBBC04"
                    d="M2 7l10 5 9-5M12 2L2 7l10 5 10-5-10-5z"
                  />
                </svg>
              </div>
              <CardTitle className="text-base">Google Drive</CardTitle>
            </div>
            <CardDescription className="text-sm mt-0.5">Recent Files</CardDescription>
          </div>
          <div className="flex items-center gap-1">
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
        <div className="flex items-center justify-between mt-0.5">
          <CardDescription className="text-sm">
            {data.totalCount || files.length} recent file{(data.totalCount || files.length) !== 1 ? 's' : ''}
          </CardDescription>
          {fileTypeStats.total > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <HardDrive className="h-3.5 w-3.5" />
              <span>{formatFileSize(fileTypeStats.total.toString())}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto pt-0 px-4 pb-3">
        {files.length === 0 ? (
          <div className="text-center py-4 text-xs text-muted-foreground">
            <FolderOpen className="h-6 w-6 mx-auto mb-1 opacity-50" />
            <p>No recent files</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {files.slice(0, 6).map((file) => {
                const isFolder = file.mimeType.includes('folder')
                
                return (
                  <Link
                    key={file.id}
                    href={file.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'group relative p-2.5 rounded-lg border bg-card transition-all hover:bg-accent/50 hover:border-primary/50'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {/* Icon on the left */}
                      <div className="flex-shrink-0">
                        {file.iconLink ? (
                          <img src={file.iconLink} alt={file.name} className="h-7 w-7" />
                        ) : (
                          <div className="h-7 w-7 flex items-center justify-center">
                            {getFileIcon(file.mimeType)}
                          </div>
                        )}
                      </div>
                      {/* Text content on the right */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-2 leading-tight">
                          {file.name}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          {isFolder ? (
                            <span>Folder</span>
                          ) : file.size !== '0' ? (
                            <span>{formatFileSize(file.size)}</span>
                          ) : null}
                          <span>•</span>
                          <span>
                            {formatDistanceToNow(new Date(file.modifiedTime), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
            {files.length > 6 && (
              <div className="flex justify-end">
                <Link
                  href="https://drive.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  View All ({data.totalCount})
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {files.slice(0, 6).map((file) => (
              <Link
                key={file.id}
                href={file.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-1.5 rounded-md hover:bg-accent/50 hover:border-primary/50 border border-transparent transition-all group"
              >
                <div className="flex-shrink-0">
                  {file.iconLink ? (
                    <img src={file.iconLink} alt={file.name} className="h-4 w-4" />
                  ) : (
                    <div className="h-4 w-4 flex items-center justify-center">
                      {getFileIcon(file.mimeType)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate mb-0.5">{file.name}</p>
                  <div className="flex items-center gap-1.5 text-[0.65rem] text-muted-foreground">
                    <span>{formatDistanceToNow(new Date(file.modifiedTime), { addSuffix: true })}</span>
                    {file.size !== '0' && (
                      <>
                        <span>•</span>
                        <span>{formatFileSize(file.size)}</span>
                      </>
                    )}
                  </div>
                </div>
                <ExternalLink className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </Link>
            ))}
            {files.length > 6 && (
              <Link href="https://drive.google.com" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="w-full mt-1 text-xs h-7">
                  View All ({data.totalCount})
                </Button>
              </Link>
            )}
          </div>
        )}
      </CardContent>
      <DriveAIModal
        open={isAIModalOpen}
        onOpenChange={setIsAIModalOpen}
        files={files}
        onFileChanged={onRefresh}
      />
    </Card>
  )
}

