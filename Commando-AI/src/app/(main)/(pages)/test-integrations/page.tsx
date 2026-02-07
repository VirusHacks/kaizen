'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Calendar, 
  Mail, 
  MailOpen, 
  Send, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  Brain
} from 'lucide-react'
import { toast } from 'sonner'

export default function TestIntegrationsPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, any>>({})

  // Calendar state
  const [calendarAction, setCalendarAction] = useState('today')
  const [eventTitle, setEventTitle] = useState('Test Meeting')
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0])
  const [eventTime, setEventTime] = useState('14:00')

  // Gmail state
  const [gmailFrom, setGmailFrom] = useState('')
  const [gmailSubject, setGmailSubject] = useState('')
  const [gmailMaxResults, setGmailMaxResults] = useState('5')
  const [sendTo, setSendTo] = useState('')
  const [sendSubject, setSendSubject] = useState('Test Email from Commando AI')
  const [sendBody, setSendBody] = useState('This is a test email sent from Commando AI workflow automation.')

  // AI state
  const [aiPrompt, setAiPrompt] = useState('Summarize the key benefits of workflow automation in 3 bullet points.')

  const testCalendarRead = async () => {
    setLoading('calendar-read')
    try {
      const params = new URLSearchParams({ action: calendarAction, maxResults: '10' })
      const res = await fetch(`/api/calendar?${params}`)
      const data = await res.json()
      setResults(prev => ({ ...prev, 'calendar-read': data }))
      if (data.success) {
        toast.success(`Found ${data.events?.length || 0} calendar events`)
      } else {
        toast.error(data.error || 'Failed to fetch calendar')
      }
    } catch (error: any) {
      toast.error(error.message)
      setResults(prev => ({ ...prev, 'calendar-read': { error: error.message } }))
    }
    setLoading(null)
  }

  const testCalendarCreate = async () => {
    setLoading('calendar-create')
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: eventTitle,
          date: eventDate,
          time: eventTime,
          duration: 30,
          description: 'Created via Commando AI test page',
        })
      })
      const data = await res.json()
      setResults(prev => ({ ...prev, 'calendar-create': data }))
      if (data.success) {
        toast.success('Calendar event created!')
      } else {
        toast.error(data.error || 'Failed to create event')
      }
    } catch (error: any) {
      toast.error(error.message)
      setResults(prev => ({ ...prev, 'calendar-create': { error: error.message } }))
    }
    setLoading(null)
  }

  const testGmailRead = async () => {
    setLoading('gmail-read')
    try {
      const params = new URLSearchParams({ 
        action: 'list', 
        maxResults: gmailMaxResults,
        ...(gmailFrom && { from: gmailFrom }),
        ...(gmailSubject && { subject: gmailSubject }),
      })
      const res = await fetch(`/api/gmail?${params}`)
      const data = await res.json()
      setResults(prev => ({ ...prev, 'gmail-read': data }))
      if (data.success) {
        toast.success(`Found ${data.emails?.length || 0} emails`)
      } else {
        toast.error(data.error || 'Failed to fetch emails')
      }
    } catch (error: any) {
      toast.error(error.message)
      setResults(prev => ({ ...prev, 'gmail-read': { error: error.message } }))
    }
    setLoading(null)
  }

  const testGmailProfile = async () => {
    setLoading('gmail-profile')
    try {
      const res = await fetch('/api/gmail?action=profile')
      const data = await res.json()
      setResults(prev => ({ ...prev, 'gmail-profile': data }))
      if (data.success) {
        toast.success(`Connected as ${data.profile?.emailAddress}`)
      } else {
        toast.error(data.error || 'Failed to get profile')
      }
    } catch (error: any) {
      toast.error(error.message)
      setResults(prev => ({ ...prev, 'gmail-profile': { error: error.message } }))
    }
    setLoading(null)
  }

  const testGmailSend = async () => {
    if (!sendTo) {
      toast.error('Please enter a recipient email')
      return
    }
    setLoading('gmail-send')
    try {
      const res = await fetch('/api/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          to: sendTo,
          subject: sendSubject,
          bodyText: sendBody,
        })
      })
      const data = await res.json()
      setResults(prev => ({ ...prev, 'gmail-send': data }))
      if (data.success) {
        toast.success('Email sent successfully!')
      } else {
        toast.error(data.error || 'Failed to send email')
      }
    } catch (error: any) {
      toast.error(error.message)
      setResults(prev => ({ ...prev, 'gmail-send': { error: error.message } }))
    }
    setLoading(null)
  }

  const testAI = async () => {
    setLoading('ai')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: aiPrompt,
        })
      })
      const data = await res.json()
      setResults(prev => ({ ...prev, 'ai': data }))
      if (data.response || data.message) {
        toast.success('AI response received!')
      } else {
        toast.error(data.error || 'Failed to get AI response')
      }
    } catch (error: any) {
      toast.error(error.message)
      setResults(prev => ({ ...prev, 'ai': { error: error.message } }))
    }
    setLoading(null)
  }

  const testGmailLabels = async () => {
    setLoading('gmail-labels')
    try {
      const res = await fetch('/api/gmail?action=labels')
      const data = await res.json()
      setResults(prev => ({ ...prev, 'gmail-labels': data }))
      if (data.success) {
        toast.success(`Found ${data.labels?.length || 0} labels`)
      } else {
        toast.error(data.error || 'Failed to fetch labels')
      }
    } catch (error: any) {
      toast.error(error.message)
      setResults(prev => ({ ...prev, 'gmail-labels': { error: error.message } }))
    }
    setLoading(null)
  }

  const ResultDisplay = ({ id }: { id: string }) => {
    const result = results[id]
    if (!result) return null
    
    return (
      <Card className="mt-4 border-neutral-800 bg-neutral-900/50">
        <CardHeader className="py-2 px-4">
          <div className="flex items-center gap-2">
            {result.success || result.response ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            <span className="text-sm font-medium">Result</span>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <ScrollArea className="h-[200px]">
            <pre className="text-xs text-neutral-300 whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🧪 Integration Tests</h1>
          <p className="text-neutral-400 mt-1">Test Google Calendar, Gmail, and AI integrations</p>
        </div>
        <Badge variant="outline" className="text-amber-400 border-amber-400">
          Development Only
        </Badge>
      </div>

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-neutral-900">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Calendar
          </TabsTrigger>
          <TabsTrigger value="gmail" className="flex items-center gap-2">
            <Mail className="h-4 w-4" /> Gmail
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Brain className="h-4 w-4" /> AI
          </TabsTrigger>
        </TabsList>

        {/* CALENDAR TAB */}
        <TabsContent value="calendar" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Read Calendar */}
            <Card className="border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-400" />
                  Read Calendar Events
                </CardTitle>
                <CardDescription>Test reading events from Google Calendar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-neutral-400">Action</label>
                  <select 
                    className="w-full mt-1 bg-neutral-800 border border-neutral-700 rounded-md p-2"
                    value={calendarAction}
                    onChange={(e) => setCalendarAction(e.target.value)}
                  >
                    <option value="today">Today's Events</option>
                    <option value="upcoming">Upcoming (24h)</option>
                    <option value="list">List All</option>
                    <option value="calendars">List Calendars</option>
                  </select>
                </div>
                <Button 
                  onClick={testCalendarRead} 
                  disabled={loading === 'calendar-read'}
                  className="w-full"
                >
                  {loading === 'calendar-read' ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing...</>
                  ) : (
                    <><RefreshCw className="mr-2 h-4 w-4" /> Fetch Events</>
                  )}
                </Button>
                <ResultDisplay id="calendar-read" />
              </CardContent>
            </Card>

            {/* Create Calendar Event */}
            <Card className="border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-green-400" />
                  Create Calendar Event
                </CardTitle>
                <CardDescription>Test creating a new event</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-neutral-400">Event Title</label>
                  <Input 
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="mt-1 bg-neutral-800 border-neutral-700"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm text-neutral-400">Date</label>
                    <Input 
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="mt-1 bg-neutral-800 border-neutral-700"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-neutral-400">Time</label>
                    <Input 
                      type="time"
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                      className="mt-1 bg-neutral-800 border-neutral-700"
                    />
                  </div>
                </div>
                <Button 
                  onClick={testCalendarCreate} 
                  disabled={loading === 'calendar-create'}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {loading === 'calendar-create' ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                  ) : (
                    <><Calendar className="mr-2 h-4 w-4" /> Create Event</>
                  )}
                </Button>
                <ResultDisplay id="calendar-create" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* GMAIL TAB */}
        <TabsContent value="gmail" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Gmail Profile */}
            <Card className="border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-red-400" />
                  Gmail Profile
                </CardTitle>
                <CardDescription>Check your Gmail connection</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={testGmailProfile} 
                  disabled={loading === 'gmail-profile'}
                  className="w-full"
                >
                  {loading === 'gmail-profile' ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking...</>
                  ) : (
                    <><Mail className="mr-2 h-4 w-4" /> Get Profile</>
                  )}
                </Button>
                <Button 
                  onClick={testGmailLabels} 
                  disabled={loading === 'gmail-labels'}
                  variant="outline"
                  className="w-full"
                >
                  {loading === 'gmail-labels' ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</>
                  ) : (
                    'List All Labels'
                  )}
                </Button>
                <ResultDisplay id="gmail-profile" />
                <ResultDisplay id="gmail-labels" />
              </CardContent>
            </Card>

            {/* Read Emails */}
            <Card className="border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MailOpen className="h-5 w-5 text-blue-400" />
                  Read Emails
                </CardTitle>
                <CardDescription>Fetch emails with filters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-neutral-400">From (optional)</label>
                  <Input 
                    placeholder="sender@example.com"
                    value={gmailFrom}
                    onChange={(e) => setGmailFrom(e.target.value)}
                    className="mt-1 bg-neutral-800 border-neutral-700"
                  />
                </div>
                <div>
                  <label className="text-sm text-neutral-400">Subject contains (optional)</label>
                  <Input 
                    placeholder="invoice, report..."
                    value={gmailSubject}
                    onChange={(e) => setGmailSubject(e.target.value)}
                    className="mt-1 bg-neutral-800 border-neutral-700"
                  />
                </div>
                <div>
                  <label className="text-sm text-neutral-400">Max Results</label>
                  <Input 
                    type="number"
                    value={gmailMaxResults}
                    onChange={(e) => setGmailMaxResults(e.target.value)}
                    className="mt-1 bg-neutral-800 border-neutral-700"
                  />
                </div>
                <Button 
                  onClick={testGmailRead} 
                  disabled={loading === 'gmail-read'}
                  className="w-full"
                >
                  {loading === 'gmail-read' ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fetching...</>
                  ) : (
                    <><MailOpen className="mr-2 h-4 w-4" /> Fetch Emails</>
                  )}
                </Button>
                <ResultDisplay id="gmail-read" />
              </CardContent>
            </Card>

            {/* Send Email */}
            <Card className="border-neutral-800 md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-green-400" />
                  Send Email
                </CardTitle>
                <CardDescription>Test sending an email (⚠️ This will actually send an email!)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-neutral-400">To *</label>
                    <Input 
                      placeholder="recipient@example.com"
                      value={sendTo}
                      onChange={(e) => setSendTo(e.target.value)}
                      className="mt-1 bg-neutral-800 border-neutral-700"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-neutral-400">Subject</label>
                    <Input 
                      value={sendSubject}
                      onChange={(e) => setSendSubject(e.target.value)}
                      className="mt-1 bg-neutral-800 border-neutral-700"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-neutral-400">Body</label>
                  <Textarea 
                    value={sendBody}
                    onChange={(e) => setSendBody(e.target.value)}
                    className="mt-1 bg-neutral-800 border-neutral-700 min-h-[100px]"
                  />
                </div>
                <Button 
                  onClick={testGmailSend} 
                  disabled={loading === 'gmail-send' || !sendTo}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {loading === 'gmail-send' ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="mr-2 h-4 w-4" /> Send Email</>
                  )}
                </Button>
                <ResultDisplay id="gmail-send" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI TAB */}
        <TabsContent value="ai" className="space-y-4">
          <Card className="border-neutral-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-400" />
                Test AI (Gemini)
              </CardTitle>
              <CardDescription>Test the AI node capabilities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-neutral-400">Prompt</label>
                <Textarea 
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Enter your prompt..."
                  className="mt-1 bg-neutral-800 border-neutral-700 min-h-[120px]"
                />
              </div>
              <Button 
                onClick={testAI} 
                disabled={loading === 'ai'}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {loading === 'ai' ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                ) : (
                  <><Brain className="mr-2 h-4 w-4" /> Ask AI</>
                )}
              </Button>
              <ResultDisplay id="ai" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
