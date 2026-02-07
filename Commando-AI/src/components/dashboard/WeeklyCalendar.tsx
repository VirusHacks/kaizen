'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, ExternalLink, RefreshCw } from 'lucide-react'
import { useState, useMemo } from 'react'
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO, isToday, addWeeks, subWeeks } from 'date-fns'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface CalendarEvent {
  id: string
  summary: string
  description: string
  start: string
  end: string
  location: string
  htmlLink: string
  attendees: Array<{ email: string; displayName?: string }>
  isAllDay: boolean
}

interface WeeklyCalendarProps {
  data: {
    events: CalendarEvent[]
    todayCount: number
  } | null
  error: string | null
  onRefresh?: () => void
}

export function WeeklyCalendar({ data, error, onRefresh }: WeeklyCalendarProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [currentWeek, setCurrentWeek] = useState(new Date())

  const handleRefresh = async () => {
    setIsRefreshing(true)
    if (onRefresh) {
      await onRefresh()
    }
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }) // Monday
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  }, [weekStart])

  const getDayEvents = (date: Date) => {
    if (!data?.events) return []
    return data.events.filter((event) => {
      const eventStartDate = parseISO(event.start)
      return isSameDay(eventStartDate, date)
    })
  }

  const getEventIcon = (summary: string) => {
    const lower = summary.toLowerCase()
    if (lower.includes('meeting') || lower.includes('team')) return 'briefcase'
    if (lower.includes('deadline') || lower.includes('due')) return 'clock'
    if (lower.includes('lunch') || lower.includes('break')) return 'bell'
    return 'calendar'
  }

  if (error) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-shrink-0 pb-3">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Calendar
          </CardTitle>
          <CardDescription>Weekly Overview</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="text-sm text-muted-foreground">
            {error === 'Google not connected' ? (
              <div className="space-y-2">
                <p>Google Calendar is not connected</p>
                <Link href="/connections">
                  <Button variant="outline" size="sm">
                    Connect Calendar
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
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-shrink-0 pb-3">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Calendar
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const events = data.events || []
  const todayCount = data.todayCount || 0

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            <CardTitle className="text-base">Calendar</CardTitle>
            {todayCount > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0 h-5">
                {todayCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
              className="h-7 w-7"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
              className="h-7 w-7"
            >
              <ChevronRight className="h-3.5 w-3.5" />
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
        <CardDescription className="text-xs mt-1">Weekly Overview</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto pt-0">
        <div className="space-y-3">
          {/* Week Days Header */}
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day) => {
              const dayEvents = getDayEvents(day)
              const isTodayDate = isToday(day)
              const isSelected = false // You can add selection logic if needed

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'flex flex-col items-center p-1.5 rounded-md border transition-all',
                    isTodayDate && 'border-primary bg-primary/5',
                    isSelected && 'border-primary bg-primary/10'
                  )}
                >
                  <div className="text-[0.65rem] text-muted-foreground mb-1">
                    {format(day, 'EEE')}
                  </div>
                  <div className="text-xs font-semibold mb-1">{format(day, 'd')}</div>
                  {dayEvents.length > 0 && (
                    <div className="h-1 w-1 rounded-full bg-primary" />
                  )}
                </div>
              )
            })}
          </div>

          {/* Events by Day */}
          <div className="space-y-2">
            {weekDays.map((day) => {
              const dayEvents = getDayEvents(day)
              const isTodayDate = isToday(day)

              if (dayEvents.length === 0) {
                return (
                  <div key={day.toISOString()} className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      {format(day, 'EEE d')}
                    </div>
                    <div className="border rounded-md p-2 bg-muted/30 text-center">
                      <p className="text-[0.65rem] text-muted-foreground">No events</p>
                    </div>
                  </div>
                )
              }

              return (
                <div key={day.toISOString()} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium">{format(day, 'EEE d')}</div>
                    {isTodayDate && (
                      <Badge variant="default" className="text-[0.65rem] px-1.5 py-0 h-4">
                        Today
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => {
                      const startDate = parseISO(event.start)
                      const endDate = parseISO(event.end)
                      const isHappeningNow = new Date() >= startDate && new Date() <= endDate

                      return (
                        <Link
                          key={event.id}
                          href={event.htmlLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            'block border rounded-md p-1.5 hover:bg-accent/50 hover:border-primary/50 transition-all group',
                            isHappeningNow && 'border-primary bg-primary/5'
                          )}
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <p className="text-xs font-medium truncate">{event.summary}</p>
                                {isHappeningNow && (
                                  <Badge variant="default" className="text-[0.65rem] px-1 py-0 h-4 animate-pulse">
                                    Now
                                  </Badge>
                                )}
                                {!isHappeningNow && (
                                  <Badge variant="secondary" className="text-[0.65rem] px-1 py-0 h-4">
                                    Upcoming
                                  </Badge>
                                )}
                              </div>
                              {!event.isAllDay && (
                                <div className="flex items-center gap-1 text-[0.65rem] text-muted-foreground">
                                  <Clock className="h-2.5 w-2.5" />
                                  <span>
                                    {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
                                  </span>
                                </div>
                              )}
                            </div>
                            <ExternalLink className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Quick Link */}
          <Link href="https://calendar.google.com" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="w-full text-xs h-7">
              View Full Calendar
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

