"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { Calendar } from "@/components/ui/Calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarIcon, AlertCircle } from "lucide-react"
import { format, isSameDay } from "date-fns"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

interface CalendarEvent {
  id: string
  summary: string
  start: {
    dateTime: string
    date?: string
  }
  end: {
    dateTime: string
    date?: string
  }
}

export function CalendarCard() {
  const { user } = useUser()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCalendarConnected, setIsCalendarConnected] = useState(true)

  useEffect(() => {
    async function fetchEvents() {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch("/api/calendar")
        if (!response.ok) {
          const errorText = await response.text()
          if (response.status === 400 && errorText.includes("Google Calendar not connected")) {
            setIsCalendarConnected(false)
            throw new Error("Google Calendar not connected")
          }
          throw new Error(`Failed to fetch events: ${response.status} ${response.statusText}. ${errorText}`)
        }
        const data = await response.json()
        setEvents(data)
        setIsCalendarConnected(true)
      } catch (error) {
        console.error("Error fetching calendar events:", error)
        setError(error instanceof Error ? error.message : "Failed to load events. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }

    if (user?.emailAddresses?.[0]?.emailAddress) {
      fetchEvents()
    } else {
      setIsLoading(false)
    }
  }, [user])

  const getDayEvents = (date: Date) => {
    return events.filter((event) => {
      const eventStartDate = event.start.date ? new Date(event.start.date) : new Date(event.start.dateTime)
      return isSameDay(eventStartDate, date)
    })
  }

  const handleConnectCalendar = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/auth/google")
      if (!response.ok) {
        throw new Error(`Failed to initiate Google Calendar connection: ${response.status} ${response.statusText}`)
      }
      const { authUrl } = await response.json()
      window.location.href = authUrl
    } catch (error) {
      console.error("Error initiating Google Calendar connection:", error)
      setError("Failed to initiate Google Calendar connection. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Calendar
        </CardTitle>
        <CardDescription>
          {user?.emailAddresses?.[0]?.emailAddress
            ? `Connected to ${user.emailAddresses[0].emailAddress}`
            : "Sign in to view your calendar"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!isCalendarConnected && (
            <Alert variant="default" className="bg-muted border-primary/20">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between flex-1">
                <span className="text-sm">Connect your calendar to view events</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleConnectCalendar}
                  disabled={isLoading}
                  className="ml-2"
                >
                  {isLoading ? "Connecting..." : "Connect Calendar"}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div
            className={cn("relative rounded-md transition-opacity duration-200", !isCalendarConnected && "opacity-75")}
          >
            {!isCalendarConnected && (
              <div className="absolute inset-0 rounded-md bg-background/50 backdrop-blur-[1px] z-10" />
            )}
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className={cn("rounded-md border", !isCalendarConnected && "pointer-events-none")}
              components={{
                DayContent: ({ date }) => (
                  <div className="relative">
                    <span>{date.getDate()}</span>
                    {isCalendarConnected && getDayEvents(date).length > 0 && (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                    )}
                  </div>
                ),
              }}
            />
          </div>

          {selectedDate && isCalendarConnected && (
            <div className="space-y-2">
              <h3 className="font-medium text-sm">Events for {format(selectedDate, "MMMM d, yyyy")}</h3>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="h-[52px] rounded-md border bg-muted/10 animate-pulse" />
                  ))}
                </div>
              ) : error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : (
                <div className="space-y-2">
                  {getDayEvents(selectedDate).length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">No events scheduled for this day.</p>
                  ) : (
                    getDayEvents(selectedDate).map((event) => (
                      <div
                        key={event.id}
                        className="text-sm p-3 rounded-md border bg-card hover:bg-accent transition-colors"
                      >
                        <p className="font-medium">{event.summary}</p>
                        {event.start.dateTime && (
                          <p className="text-muted-foreground text-xs mt-1">
                            {format(new Date(event.start.dateTime), "h:mm a")} -{" "}
                            {format(new Date(event.end.dateTime), "h:mm a")}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

