'use client'

import { useDashboard } from '@/hooks/useDashboard'
import { GmailWidget } from '@/components/dashboard/GmailWidget'
import { CalendarWidget } from '@/components/dashboard/CalendarWidget'
import { DriveWidget } from '@/components/dashboard/DriveWidget'
import { NotionWidget } from '@/components/dashboard/NotionWidget'
import { WorkflowsWidget } from '@/components/dashboard/WorkflowsWidget'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { FileTypesChart } from '@/components/dashboard/FileTypesChart'
import { PopupAssistant } from '@/components/PopupAssistant'
import { RefreshCw, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useDashboard()

  if (isLoading && !data) {
    return (
      <div className="flex flex-col h-full">
        <header className="sticky top-0 z-[10] w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center justify-between px-4 md:px-6">
            <h1 className="text-2xl font-semibold">Dashboard</h1>
          </div>
        </header>
        <main className="flex-1 py-6 overflow-y-auto px-4 md:px-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-4">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading dashboard...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="flex flex-col h-full">
        <header className="sticky top-0 z-[10] w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center justify-between px-4 md:px-6">
            <h1 className="text-2xl font-semibold">Dashboard</h1>
          </div>
        </header>
        <main className="flex-1 py-6 overflow-y-auto px-4 md:px-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={refetch}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </main>
      </div>
    )
  }

  return (
    <div className="h-full p-4">
      {/* Error Alert if partial failure */}
      {error && data && (
        <Alert className="py-2 mb-3">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-sm">Partial Data Load</AlertTitle>
          <AlertDescription className="text-xs">
            Some data failed to load: {error}. Showing available information.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Grid - Professional Layout */}
      <div className="space-y-3">
        {/* Row 1: Quick Actions and File Types Distribution */}
        <div className="grid gap-3 grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <QuickActions />
          </div>
          <div className="lg:col-span-4">
            {data?.drive.data?.files && data.drive.data.files.length > 0 && (
              <FileTypesChart
                fileTypes={
                  (() => {
                    const types: Record<string, number> = {}
                    data.drive.data?.files.forEach((file) => {
                      if (file.mimeType.includes('folder')) {
                        types['Folder'] = (types['Folder'] || 0) + 1
                      } else if (file.mimeType.includes('image')) {
                        types['Image'] = (types['Image'] || 0) + 1
                      } else if (file.mimeType.includes('document') || file.mimeType.includes('word')) {
                        types['Document'] = (types['Document'] || 0) + 1
                      } else {
                        types['Other'] = (types['Other'] || 0) + 1
                      }
                    })
                    return types
                  })()
                }
              />
            )}
          </div>
        </div>

        {/* Row 2: Google Drive (left) and Right Column (Workflows + Activity Feed) */}
        <div className="grid gap-3 grid-cols-1 lg:grid-cols-12">
          {/* Left Column: Drive and Notion stacked */}
          <div className="lg:col-span-7 space-y-3">
            {data?.drive.data && data.drive.data.files && data.drive.data.files.length > 0 && (
              <DriveWidget
                data={data.drive.data}
                error={data.drive.error}
                onRefresh={refetch}
              />
            )}
            {data?.notion.data && data.notion.data.pages && data.notion.data.pages.length > 0 && (
              <NotionWidget
                data={data.notion.data}
                error={data.notion.error}
                onRefresh={refetch}
                forceListView={true}
              />
            )}
          </div>

          {/* Right Column: Workflows and Activity Feed stacked */}
          <div className="lg:col-span-5 space-y-3">
            {data?.workflows.data && data.workflows.data.activeCount > 0 && (
              <WorkflowsWidget
                data={data.workflows.data}
                error={data.workflows.error}
                onRefresh={refetch}
              />
            )}
            <ActivityFeed
              gmailData={data?.gmail}
              calendarData={data?.calendar}
              driveData={data?.drive}
              notionData={data?.notion}
              workflowsData={data?.workflows}
            />
          </div>
        </div>

        {/* Row 3: Gmail and Calendar */}
        <div className="grid gap-3 grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-8">
            {data?.gmail.data && (
              <GmailWidget
                data={data.gmail.data}
                error={data.gmail.error}
                onRefresh={refetch}
              />
            )}
          </div>
          <div className="lg:col-span-4">
            {data?.calendar.data && (
              <CalendarWidget
                data={data.calendar.data}
                error={data.calendar.error}
                onRefresh={refetch}
              />
            )}
          </div>
        </div>
      </div>

      {/* PopupAssistant - Fixed position */}
      <div className="fixed bottom-4 right-4 z-50">
        <PopupAssistant />
      </div>
    </div>
  )
}

