import { auth, clerkClient } from "@clerk/nextjs/server"
import { google } from "googleapis"
import { NextRequest, NextResponse } from "next/server"

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

// Helper to get OAuth client with user tokens
async function getOAuth2Client(userId: string) {
  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  const { googleAccessToken, googleRefreshToken } = user.privateMetadata as {
    googleAccessToken?: string
    googleRefreshToken?: string
  }

  if (!googleAccessToken) {
    return null
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  )

  oauth2Client.setCredentials({
    access_token: googleAccessToken,
    refresh_token: googleRefreshToken,
  })

  // Set up automatic token refresh
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

// GET - List calendar events with various filters
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const oauth2Client = await getOAuth2Client(userId)
    if (!oauth2Client) {
      return NextResponse.json({ connected: false, error: "Google Calendar not connected" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'list'
    const eventId = searchParams.get('eventId')
    const maxResults = parseInt(searchParams.get('maxResults') || '10')
    const timeMin = searchParams.get('timeMin') || new Date().toISOString()
    const timeMax = searchParams.get('timeMax')
    const query = searchParams.get('q') // Search query
    const calendarId = searchParams.get('calendarId') || 'primary'

    const calendar = google.calendar({ version: "v3", auth: oauth2Client })

    switch (action) {
      case 'get': {
        // Get a specific event by ID
        if (!eventId) {
          return NextResponse.json({ error: "Event ID is required" }, { status: 400 })
        }
        const event = await calendar.events.get({
          calendarId,
          eventId,
        })
        return NextResponse.json({ 
          connected: true,
          event: {
            id: event.data.id,
            summary: event.data.summary,
            description: event.data.description,
            start: event.data.start,
            end: event.data.end,
            location: event.data.location,
            attendees: event.data.attendees,
            status: event.data.status,
            htmlLink: event.data.htmlLink,
            creator: event.data.creator,
            organizer: event.data.organizer,
            created: event.data.created,
            updated: event.data.updated,
          }
        })
      }

      case 'upcoming': {
        // Get upcoming events (next 24 hours)
        const now = new Date()
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
        const response = await calendar.events.list({
          calendarId,
          timeMin: now.toISOString(),
          timeMax: tomorrow.toISOString(),
          maxResults: maxResults,
          singleEvents: true,
          orderBy: "startTime",
        })
        return NextResponse.json({ 
          connected: true,
          events: response.data.items?.map(formatEvent) || [],
          timeRange: { from: now.toISOString(), to: tomorrow.toISOString() }
        })
      }

      case 'today': {
        // Get today's events
        const now = new Date()
        const startOfDay = new Date(now.setHours(0, 0, 0, 0))
        const endOfDay = new Date(now.setHours(23, 59, 59, 999))
        const response = await calendar.events.list({
          calendarId,
          timeMin: startOfDay.toISOString(),
          timeMax: endOfDay.toISOString(),
          maxResults: 50,
          singleEvents: true,
          orderBy: "startTime",
        })
        return NextResponse.json({ 
          connected: true,
          events: response.data.items?.map(formatEvent) || [],
          date: startOfDay.toDateString()
        })
      }

      case 'search': {
        // Search events by query
        const response = await calendar.events.list({
          calendarId,
          timeMin,
          timeMax: timeMax || undefined,
          maxResults,
          singleEvents: true,
          orderBy: "startTime",
          q: query || undefined,
        })
        return NextResponse.json({ 
          connected: true,
          events: response.data.items?.map(formatEvent) || [],
          query
        })
      }

      case 'freebusy': {
        // Get free/busy information
        const response = await calendar.freebusy.query({
          requestBody: {
            timeMin: timeMin,
            timeMax: timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            items: [{ id: calendarId }],
          },
        })
        return NextResponse.json({ 
          connected: true,
          busy: response.data.calendars?.[calendarId]?.busy || [],
          timeRange: { from: timeMin, to: timeMax }
        })
      }

      case 'calendars': {
        // List all calendars
        const response = await calendar.calendarList.list()
        return NextResponse.json({ 
          connected: true,
          calendars: response.data.items?.map(cal => ({
            id: cal.id,
            summary: cal.summary,
            description: cal.description,
            primary: cal.primary,
            backgroundColor: cal.backgroundColor,
            accessRole: cal.accessRole,
          })) || []
        })
      }

      case 'list':
      default: {
        // Default: list upcoming events
        const response = await calendar.events.list({
          calendarId,
          timeMin,
          timeMax: timeMax || undefined,
          maxResults,
          singleEvents: true,
          orderBy: "startTime",
        })
        return NextResponse.json({ 
          connected: true,
          events: response.data.items?.map(formatEvent) || []
        })
      }
    }
  } catch (error: any) {
    console.error("Failed to fetch calendar data:", error)
    
    if (error?.code === 401 || error?.message?.includes('Invalid Credentials')) {
      return NextResponse.json(
        { connected: false, error: "Google Calendar token expired. Please reconnect." },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: error?.message || "Failed to fetch calendar data" },
      { status: 500 }
    )
  }
}

// Helper function to format event data
function formatEvent(event: any) {
  return {
    id: event.id,
    summary: event.summary,
    description: event.description,
    start: event.start,
    end: event.end,
    location: event.location,
    status: event.status,
    htmlLink: event.htmlLink,
    attendees: event.attendees?.map((a: any) => ({
      email: a.email,
      displayName: a.displayName,
      responseStatus: a.responseStatus,
    })),
    organizer: event.organizer,
    created: event.created,
    updated: event.updated,
    // Calculate if event is happening now
    isNow: isEventHappeningNow(event),
    // Calculate minutes until event starts
    minutesUntilStart: getMinutesUntilStart(event),
  }
}

function isEventHappeningNow(event: any): boolean {
  const now = new Date()
  const start = new Date(event.start?.dateTime || event.start?.date)
  const end = new Date(event.end?.dateTime || event.end?.date)
  return now >= start && now <= end
}

function getMinutesUntilStart(event: any): number | null {
  const now = new Date()
  const start = new Date(event.start?.dateTime || event.start?.date)
  if (start <= now) return null
  return Math.round((start.getTime() - now.getTime()) / (1000 * 60))
}

// POST - Create a new calendar event
export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const oauth2Client = await getOAuth2Client(userId)
    if (!oauth2Client) {
      return NextResponse.json(
        { error: "Google Calendar not connected. Please connect from Connections page." },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { 
      summary, 
      description, 
      startDateTime, 
      endDateTime, 
      location,
      attendees,
      reminders,
      timeZone = 'UTC'
    } = body

    if (!summary || !startDateTime || !endDateTime) {
      return NextResponse.json(
        { error: "Missing required fields: summary, startDateTime, endDateTime" },
        { status: 400 }
      )
    }

    const calendar = google.calendar({ version: "v3", auth: oauth2Client })
    
    const event: any = {
      summary,
      description,
      location,
      start: {
        dateTime: startDateTime,
        timeZone,
      },
      end: {
        dateTime: endDateTime,
        timeZone,
      },
    }

    // Add attendees if provided
    if (attendees && Array.isArray(attendees)) {
      event.attendees = attendees.map((email: string) => ({ email }))
    }

    // Add reminders if provided
    if (reminders) {
      event.reminders = {
        useDefault: false,
        overrides: reminders,
      }
    }

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
      sendUpdates: attendees ? 'all' : 'none',
    })

    return NextResponse.json({
      success: true,
      event: {
        id: response.data.id,
        summary: response.data.summary,
        htmlLink: response.data.htmlLink,
        start: response.data.start,
        end: response.data.end,
      }
    })
  } catch (error: any) {
    console.error("Failed to create calendar event:", error)
    
    if (error?.code === 401 || error?.message?.includes('Invalid Credentials')) {
      return NextResponse.json(
        { error: "Google Calendar token expired. Please reconnect from Connections page." },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: error?.message || "Failed to create calendar event" },
      { status: 500 }
    )
  }
}

// DELETE - Delete a calendar event
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const oauth2Client = await getOAuth2Client(userId)
    if (!oauth2Client) {
      return NextResponse.json(
        { error: "Google Calendar not connected" },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      )
    }

    const calendar = google.calendar({ version: "v3", auth: oauth2Client })
    await calendar.events.delete({
      calendarId: "primary",
      eventId,
    })

    return NextResponse.json({ success: true, message: "Event deleted" })
  } catch (error: any) {
    console.error("Failed to delete calendar event:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to delete calendar event" },
      { status: 500 }
    )
  }
}

// PATCH - Update a calendar event
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const oauth2Client = await getOAuth2Client(userId)
    if (!oauth2Client) {
      return NextResponse.json(
        { error: "Google Calendar not connected" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { 
      eventId,
      summary, 
      description, 
      startDateTime, 
      endDateTime, 
      location,
      attendees,
      timeZone = 'UTC',
      calendarId = 'primary'
    } = body

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      )
    }

    const calendar = google.calendar({ version: "v3", auth: oauth2Client })
    
    // First, get the existing event
    const existingEvent = await calendar.events.get({
      calendarId,
      eventId,
    })

    // Build update object, keeping existing values if not provided
    const updateData: any = {
      summary: summary || existingEvent.data.summary,
      description: description !== undefined ? description : existingEvent.data.description,
      location: location !== undefined ? location : existingEvent.data.location,
    }

    // Only update start/end if provided
    if (startDateTime && endDateTime) {
      updateData.start = {
        dateTime: startDateTime,
        timeZone,
      }
      updateData.end = {
        dateTime: endDateTime,
        timeZone,
      }
    } else {
      updateData.start = existingEvent.data.start
      updateData.end = existingEvent.data.end
    }

    // Update attendees if provided
    if (attendees && Array.isArray(attendees)) {
      updateData.attendees = attendees.map((email: string) => ({ email }))
    }

    const response = await calendar.events.update({
      calendarId,
      eventId,
      requestBody: updateData,
      sendUpdates: attendees ? 'all' : 'none',
    })

    return NextResponse.json({
      success: true,
      event: {
        id: response.data.id,
        summary: response.data.summary,
        description: response.data.description,
        location: response.data.location,
        htmlLink: response.data.htmlLink,
        start: response.data.start,
        end: response.data.end,
        updated: response.data.updated,
      }
    })
  } catch (error: any) {
    console.error("Failed to update calendar event:", error)
    
    if (error?.code === 404) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      )
    }
    
    if (error?.code === 401 || error?.message?.includes('Invalid Credentials')) {
      return NextResponse.json(
        { error: "Google Calendar token expired. Please reconnect." },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: error?.message || "Failed to update calendar event" },
      { status: 500 }
    )
  }
}