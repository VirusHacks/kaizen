import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { google } from 'googleapis'
import { Client } from '@notionhq/client'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Helper to get Google OAuth client
async function getGoogleOAuthClient(userId: string) {
  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  const googleAccessToken = user.privateMetadata?.googleAccessToken as string | undefined
  const googleRefreshToken = user.privateMetadata?.googleRefreshToken as string | undefined

  if (!googleAccessToken) {
    return null
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  oauth2Client.setCredentials({
    access_token: googleAccessToken,
    refresh_token: googleRefreshToken,
  })

  // Handle token refresh
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      try {
        await client.users.updateUser(userId, {
          privateMetadata: {
            ...user.privateMetadata,
            googleAccessToken: tokens.access_token,
          },
        })
      } catch (e) {
        console.error('Failed to update refreshed token:', e)
      }
    }
  })

  return oauth2Client
}

// Fetch Gmail unread emails
async function fetchGmailUnread(userId: string) {
  try {
    const oauth2Client = await getGoogleOAuthClient(userId)
    if (!oauth2Client) {
      return { success: false, error: 'Google not connected', data: null }
    }

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread',
      maxResults: 10,
    })

    const messages = response.data.messages || []
    
    if (messages.length === 0) {
      return { success: true, data: { emails: [], unreadCount: 0 } }
    }

    // Fetch full message details
    const fullMessages = await Promise.all(
      messages.slice(0, 5).map(async (msg) => {
        try {
          const full = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id!,
            format: 'full',
          })

          const headers = full.data.payload?.headers || []
          const getHeader = (name: string) =>
            headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || ''

          return {
            id: full.data.id,
            threadId: full.data.threadId,
            subject: getHeader('Subject'),
            from: getHeader('From'),
            snippet: full.data.snippet || '',
            date: new Date(parseInt(full.data.internalDate || '0')).toISOString(),
            isUnread: full.data.labelIds?.includes('UNREAD') || false,
          }
        } catch (error) {
          console.error('Error fetching email details:', error)
          return null
        }
      })
    )

    const validMessages = fullMessages.filter(Boolean)
    
    return {
      success: true,
      data: {
        emails: validMessages,
        unreadCount: messages.length,
      },
    }
  } catch (error: any) {
    console.error('Gmail fetch error:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch emails',
      data: null,
    }
  }
}

// Fetch Calendar events
async function fetchCalendarEvents(userId: string) {
  try {
    const oauth2Client = await getGoogleOAuthClient(userId)
    if (!oauth2Client) {
      return { success: false, error: 'Google not connected', data: null }
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    
    const now = new Date()
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)
    
    // Fetch events from 30 days ago to 60 days in the future for calendar view
    const timeMin = new Date(today)
    timeMin.setDate(timeMin.getDate() - 30)
    
    const timeMax = new Date(today)
    timeMax.setDate(timeMax.getDate() + 60)
    timeMax.setHours(23, 59, 59, 999)

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      maxResults: 250, // Increased to get more events for calendar view
      singleEvents: true,
      orderBy: 'startTime',
    })

    const allEvents = (response.data.items || [])
      .filter((event) => event.start) // Filter out events without start time
      .map((event) => ({
        id: event.id,
        summary: event.summary || 'No Title',
        description: event.description || '',
        start: event.start?.dateTime || event.start?.date || '',
        end: event.end?.dateTime || event.end?.date || '',
        location: event.location || '',
        htmlLink: event.htmlLink || '',
        attendees: event.attendees?.map((a) => ({
          email: a.email,
          displayName: a.displayName,
        })) || [],
        isAllDay: !event.start?.dateTime,
      }))

    // Count today's events
    const todayEvents = allEvents.filter((event) => {
      if (!event.start) return false
      const eventStart = new Date(event.start)
      return eventStart >= today && eventStart < new Date(today.getTime() + 24 * 60 * 60 * 1000)
    })

    return {
      success: true,
      data: {
        events: allEvents,
        todayCount: todayEvents.length,
      },
    }
  } catch (error: any) {
    console.error('Calendar fetch error:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch calendar events',
      data: null,
    }
  }
}

// Fetch Google Drive files
async function fetchDriveFiles(userId: string) {
  try {
    const oauth2Client = await getGoogleOAuthClient(userId)
    if (!oauth2Client) {
      return { success: false, error: 'Google not connected', data: null }
    }

    const drive = google.drive({ version: 'v3', auth: oauth2Client })
    
    const response = await drive.files.list({
      pageSize: 10,
      fields: 'files(id, name, mimeType, iconLink, webViewLink, createdTime, modifiedTime, size)',
      orderBy: 'modifiedTime desc',
    })

    const files = (response.data.files || []).map((file) => ({
      id: file.id,
      name: file.name || 'Untitled',
      mimeType: file.mimeType || '',
      iconLink: file.iconLink || '',
      webViewLink: file.webViewLink || '',
      createdTime: file.createdTime || '',
      modifiedTime: file.modifiedTime || '',
      size: file.size || '0',
    }))

    return {
      success: true,
      data: {
        files,
        totalCount: files.length,
      },
    }
  } catch (error: any) {
    console.error('Drive fetch error:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch Drive files',
      data: null,
    }
  }
}

// Fetch Notion pages
async function fetchNotionPages(userId: string) {
  try {
    const notion = await db.notion.findFirst({
      where: { userId },
      select: { accessToken: true, databaseId: true },
    })

    if (!notion || !notion.accessToken) {
      return { success: false, error: 'Notion not connected', data: null }
    }

    const notionClient = new Client({ auth: notion.accessToken })

    // Search for recent pages
    const response = await notionClient.search({
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time',
      },
      page_size: 10,
    })

    const pages = response.results
      .filter((page: any) => page.object === 'page')
      .slice(0, 5)
      .map((page: any) => ({
        id: page.id,
        title: page.properties?.title?.title?.[0]?.plain_text || 'Untitled',
        url: page.url,
        lastEditedTime: page.last_edited_time,
        createdTime: page.created_time,
      }))

    return {
      success: true,
      data: {
        pages,
        totalCount: response.results.length,
      },
    }
  } catch (error: any) {
    console.error('Notion fetch error:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch Notion pages',
      data: null,
    }
  }
}

// Fetch workflows
async function fetchWorkflows(userId: string) {
  try {
    const workflows = await db.workflows.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        description: true,
        publish: true,
      },
      take: 10,
    })

    // Add timestamps manually if needed (workflows don't have createdAt/updatedAt in schema)
    const workflowsWithTimestamps = workflows.map((w) => ({
      ...w,
      createdAt: new Date().toISOString(), // Placeholder since schema doesn't have this
      updatedAt: new Date().toISOString(), // Placeholder since schema doesn't have this
    }))

    return {
      success: true,
      data: {
        workflows: workflowsWithTimestamps,
        totalCount: workflows.length,
        activeCount: workflows.filter((w) => w.publish).length,
      },
    }
  } catch (error: any) {
    console.error('Workflows fetch error:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch workflows',
      data: null,
    }
  }
}

// Main dashboard API route
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all data in parallel
    const [gmailData, calendarData, driveData, notionData, workflowsData] = await Promise.all([
      fetchGmailUnread(userId),
      fetchCalendarEvents(userId),
      fetchDriveFiles(userId),
      fetchNotionPages(userId),
      fetchWorkflows(userId),
    ])

    // Calculate stats
    const stats = {
      unreadEmails: gmailData.success ? gmailData.data?.unreadCount || 0 : 0,
      todayEvents: calendarData.success ? calendarData.data?.todayCount || 0 : 0,
      recentFiles: driveData.success ? driveData.data?.totalCount || 0 : 0,
      notionPages: notionData.success ? notionData.data?.totalCount || 0 : 0,
      totalWorkflows: workflowsData.success ? workflowsData.data?.totalCount || 0 : 0,
      activeWorkflows: workflowsData.success ? workflowsData.data?.activeCount || 0 : 0,
    }

    return NextResponse.json({
      success: true,
      data: {
        stats,
        gmail: gmailData,
        calendar: calendarData,
        drive: driveData,
        notion: notionData,
        workflows: workflowsData,
      },
    })
  } catch (error: any) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch dashboard data',
      },
      { status: 500 }
    )
  }
}

