'use client'

import { useState, useEffect, useCallback } from 'react'

interface DashboardData {
  stats: {
    unreadEmails: number
    todayEvents: number
    recentFiles: number
    notionPages: number
    totalWorkflows: number
    activeWorkflows: number
  }
  gmail: {
    success: boolean
    data: {
      emails: Array<{
        id: string
        threadId: string
        subject: string
        from: string
        snippet: string
        date: string
        isUnread: boolean
      }>
      unreadCount: number
    } | null
    error: string | null
  }
  calendar: {
    success: boolean
    data: {
      events: Array<{
        id: string
        summary: string
        description: string
        start: string
        end: string
        location: string
        htmlLink: string
        attendees: Array<{ email: string; displayName?: string }>
        isAllDay: boolean
      }>
      todayCount: number
    } | null
    error: string | null
  }
  drive: {
    success: boolean
    data: {
      files: Array<{
        id: string
        name: string
        mimeType: string
        iconLink: string
        webViewLink: string
        createdTime: string
        modifiedTime: string
        size: string
      }>
      totalCount: number
    } | null
    error: string | null
  }
  notion: {
    success: boolean
    data: {
      pages: Array<{
        id: string
        title: string
        url: string
        lastEditedTime: string
        createdTime: string
      }>
      totalCount: number
    } | null
    error: string | null
  }
  workflows: {
    success: boolean
    data: {
      workflows: Array<{
        id: string
        name: string
        description: string
        publish: boolean | null
        createdAt: string
        updatedAt: string
      }>
      totalCount: number
      activeCount: number
    } | null
    error: string | null
  }
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/dashboard')
      
      // Check content type before parsing
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response. Please try refreshing the page.')
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch dashboard data')
      }

      setData(result.data)
    } catch (err: any) {
      console.error('Dashboard fetch error:', err)
      setError(err.message || 'Failed to load dashboard')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()

    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchData, 120000)
    return () => clearInterval(interval)
  }, [fetchData])

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  }
}

