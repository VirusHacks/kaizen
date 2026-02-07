'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarIcon, Clock, MapPin, Users, ExternalLink, RefreshCw, Bot } from 'lucide-react'
import { useState } from 'react'
import { format, formatDistanceToNow, isToday, isSameDay, parseISO } from 'date-fns'
import Link from 'next/link'
import { Calendar } from '@/components/ui/Calendar'
import { cn } from '@/lib/utils'
import { CalendarAIModal } from './CalendarAIModal'

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

interface CalendarWidgetProps {
  data: {
    events: CalendarEvent[]
    todayCount: number
  } | null
  error: string | null
  onRefresh?: () => void
}

export function CalendarWidget({ data, error, onRefresh }: CalendarWidgetProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [isAIModalOpen, setIsAIModalOpen] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    if (onRefresh) {
      await onRefresh()
    }
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const getDayEvents = (date: Date) => {
    if (!data?.events) return []
    return data.events.filter((event) => {
      const eventStartDate = parseISO(event.start)
      return isSameDay(eventStartDate, date)
    })
  }

  if (error) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Calendar
          </CardTitle>
          <CardDescription>Upcoming events</CardDescription>
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
      <Card className="flex flex-col">
        <CardHeader className="flex-shrink-0">
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

  const getNextEvent = () => {
    const now = new Date()
    return events.find((event) => {
      const start = parseISO(event.start)
      return start >= now
    })
  }

  const nextEvent = getNextEvent()

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-shrink-0 py-3 px-4">
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
        <CardDescription className="text-sm mt-0.5">
          {todayCount > 0 ? `${todayCount} event${todayCount > 1 ? 's' : ''} today` : 'No events today'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto pt-0 px-4 pb-3">
        {error ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            <CalendarIcon className="h-6 w-6 mx-auto mb-1 opacity-50" />
            <p>{error}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Calendar Grid */}
            <div className="border rounded-lg p-2 bg-card">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md w-full"
                classNames={{
                  months: 'flex flex-col space-y-2',
                  month: 'space-y-2',
                  caption: 'flex justify-center pt-0.5 relative items-center',
                  caption_label: 'text-sm font-semibold',
                  nav: 'space-x-1 flex items-center',
                  table: 'w-full border-collapse',
                  head_row: 'flex',
                  head_cell: 'text-muted-foreground rounded-md w-8 font-normal text-xs',
                  row: 'flex w-full mt-1',
                  cell: 'h-8 w-8 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
                  day: cn(
                    'h-8 w-8 p-0 font-normal text-sm aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground'
                  ),
                  day_selected: 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
                  day_today: 'bg-accent text-accent-foreground',
                  day_outside: 'day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30',
                  day_disabled: 'text-muted-foreground opacity-50',
                  day_range_middle: 'aria-selected:bg-accent aria-selected:text-accent-foreground',
                  day_hidden: 'invisible',
                }}
                components={{
                  DayContent: ({ date }) => {
                    const dayEvents = getDayEvents(date)
                    const hasEvents = dayEvents.length > 0
                    const isSelected = selectedDate && isSameDay(date, selectedDate)
                    const isTodayDate = isToday(date)

                    return (
                      <div className="relative flex flex-col items-center justify-center h-full w-full">
                        <span
                          className={cn(
                            'text-xs z-10',
                            isSelected && 'font-bold',
                            isTodayDate && !isSelected && 'font-semibold'
                          )}
                        >
                          {date.getDate()}
                        </span>
                        {hasEvents && (
                          <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full z-10" />
                        )}
                      </div>
                    )
                  },
                }}
              />
            </div>

            {/* Selected Date Events */}
            {selectedDate && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    {format(selectedDate, 'MMM d, yyyy')}
                  </h3>
                  {getDayEvents(selectedDate).length > 0 && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
                      {getDayEvents(selectedDate).length}
                    </Badge>
                  )}
                </div>
                {getDayEvents(selectedDate).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No events</p>
                ) : (
                  <div className="space-y-1 max-h-[140px] overflow-y-auto">
                    {getDayEvents(selectedDate).map((event) => {
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
                            'block border rounded-lg p-2 hover:bg-accent/50 hover:border-primary/50 transition-all group',
                            isHappeningNow && 'border-primary bg-primary/5'
                          )}
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium truncate">{event.summary}</p>
                                {isHappeningNow && (
                                  <Badge variant="default" className="text-xs px-1 py-0 h-4 animate-pulse">
                                    Now
                                  </Badge>
                                )}
                              </div>
                              {!event.isAllDay && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <span>
                                    {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
                                  </span>
                                </div>
                              )}
                            </div>
                            <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Quick Link */}
            <Link href="https://calendar.google.com" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="w-full text-sm h-8">
                View Full Calendar
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
      <CalendarAIModal
        open={isAIModalOpen}
        onOpenChange={setIsAIModalOpen}
        events={events}
        onEventCreated={onRefresh}
      />
    </Card>
  )
}

