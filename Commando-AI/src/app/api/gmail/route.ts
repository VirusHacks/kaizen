import { auth, clerkClient } from "@clerk/nextjs/server"
import { google } from "googleapis"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

// Helper to create OAuth client with tokens
async function getGmailClient(userId: string) {
  const user = await clerkClient.users.getUser(userId)
  const accessToken = user.privateMetadata.googleAccessToken as string
  const refreshToken = user.privateMetadata.googleRefreshToken as string

  if (!accessToken || !refreshToken) {
    throw new Error("Google not connected")
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.OAUTH_REDIRECT_URI
  )

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  // Handle token refresh
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await clerkClient.users.updateUser(userId, {
        privateMetadata: {
          ...user.privateMetadata,
          googleAccessToken: tokens.access_token,
        },
      })
    }
  })

  return google.gmail({ version: 'v1', auth: oauth2Client })
}

// Helper to decode base64url
function decodeBase64Url(str: string): string {
  try {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
    return Buffer.from(base64, 'base64').toString('utf-8')
  } catch {
    return str
  }
}

// Helper to extract email body from message parts
function extractBody(payload: any): { text: string; html: string } {
  let text = ''
  let html = ''

  if (payload.body?.data) {
    const decoded = decodeBase64Url(payload.body.data)
    if (payload.mimeType === 'text/plain') text = decoded
    if (payload.mimeType === 'text/html') html = decoded
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        text = decodeBase64Url(part.body.data)
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        html = decodeBase64Url(part.body.data)
      } else if (part.parts) {
        const nested = extractBody(part)
        if (nested.text) text = nested.text
        if (nested.html) html = nested.html
      }
    }
  }

  return { text, html }
}

// Helper to format email message
function formatEmail(message: any) {
  const headers = message.payload?.headers || []
  const getHeader = (name: string) => 
    headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || ''

  const { text, html } = extractBody(message.payload || {})

  // Extract attachments info
  const attachments: any[] = []
  const extractAttachments = (parts: any[]) => {
    if (!parts) return
    for (const part of parts) {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size,
          attachmentId: part.body.attachmentId,
        })
      }
      if (part.parts) extractAttachments(part.parts)
    }
  }
  extractAttachments(message.payload?.parts || [])

  return {
    id: message.id,
    threadId: message.threadId,
    labelIds: message.labelIds || [],
    snippet: message.snippet,
    internalDate: message.internalDate,
    date: new Date(parseInt(message.internalDate)).toISOString(),
    from: getHeader('From'),
    to: getHeader('To'),
    cc: getHeader('Cc'),
    bcc: getHeader('Bcc'),
    subject: getHeader('Subject'),
    replyTo: getHeader('Reply-To'),
    bodyText: text,
    bodyHtml: html,
    hasAttachments: attachments.length > 0,
    attachments,
    isUnread: message.labelIds?.includes('UNREAD') || false,
    isStarred: message.labelIds?.includes('STARRED') || false,
    isImportant: message.labelIds?.includes('IMPORTANT') || false,
  }
}

// Build Gmail search query from filters
function buildSearchQuery(filters: {
  from?: string
  to?: string
  subject?: string
  label?: string
  hasAttachment?: boolean
  isUnread?: boolean
  isStarred?: boolean
  after?: string
  before?: string
  query?: string
}): string {
  const parts: string[] = []

  if (filters.from) parts.push(`from:${filters.from}`)
  if (filters.to) parts.push(`to:${filters.to}`)
  if (filters.subject) parts.push(`subject:${filters.subject}`)
  if (filters.label) parts.push(`label:${filters.label}`)
  if (filters.hasAttachment) parts.push('has:attachment')
  if (filters.isUnread) parts.push('is:unread')
  if (filters.isStarred) parts.push('is:starred')
  if (filters.after) parts.push(`after:${filters.after}`)
  if (filters.before) parts.push(`before:${filters.before}`)
  if (filters.query) parts.push(filters.query)

  return parts.join(' ')
}

// GET: Read emails with filters
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const gmail = await getGmailClient(userId)
    const { searchParams } = new URL(request.url)
    
    const action = searchParams.get('action') || 'list'
    
    switch (action) {
      case 'list': {
        // Build search query from filters
        const filters = {
          from: searchParams.get('from') || undefined,
          to: searchParams.get('to') || undefined,
          subject: searchParams.get('subject') || undefined,
          label: searchParams.get('label') || undefined,
          hasAttachment: searchParams.get('hasAttachment') === 'true',
          isUnread: searchParams.get('isUnread') === 'true',
          isStarred: searchParams.get('isStarred') === 'true',
          after: searchParams.get('after') || undefined,
          before: searchParams.get('before') || undefined,
          query: searchParams.get('query') || undefined,
        }

        const q = buildSearchQuery(filters)
        const maxResults = parseInt(searchParams.get('maxResults') || '10')

        const listResponse = await gmail.users.messages.list({
          userId: 'me',
          q: q || undefined,
          maxResults,
        })

        const messages = listResponse.data.messages || []
        
        // Fetch full message details
        const fullMessages = await Promise.all(
          messages.map(async (msg) => {
            const full = await gmail.users.messages.get({
              userId: 'me',
              id: msg.id!,
              format: 'full',
            })
            return formatEmail(full.data)
          })
        )

        return NextResponse.json({
          success: true,
          emails: fullMessages,
          resultSizeEstimate: listResponse.data.resultSizeEstimate,
          nextPageToken: listResponse.data.nextPageToken,
        })
      }

      case 'get': {
        const messageId = searchParams.get('messageId')
        if (!messageId) {
          return NextResponse.json({ error: "messageId required" }, { status: 400 })
        }

        const message = await gmail.users.messages.get({
          userId: 'me',
          id: messageId,
          format: 'full',
        })

        return NextResponse.json({
          success: true,
          email: formatEmail(message.data),
        })
      }

      case 'thread': {
        const threadId = searchParams.get('threadId')
        if (!threadId) {
          return NextResponse.json({ error: "threadId required" }, { status: 400 })
        }

        const thread = await gmail.users.threads.get({
          userId: 'me',
          id: threadId,
          format: 'full',
        })

        const messages = (thread.data.messages || []).map(formatEmail)

        return NextResponse.json({
          success: true,
          thread: {
            id: thread.data.id,
            messages,
          },
        })
      }

      case 'labels': {
        const labels = await gmail.users.labels.list({
          userId: 'me',
        })

        return NextResponse.json({
          success: true,
          labels: labels.data.labels,
        })
      }

      case 'attachment': {
        const messageId = searchParams.get('messageId')
        const attachmentId = searchParams.get('attachmentId')
        
        if (!messageId || !attachmentId) {
          return NextResponse.json({ error: "messageId and attachmentId required" }, { status: 400 })
        }

        const attachment = await gmail.users.messages.attachments.get({
          userId: 'me',
          messageId,
          id: attachmentId,
        })

        return NextResponse.json({
          success: true,
          attachment: {
            data: attachment.data.data,
            size: attachment.data.size,
          },
        })
      }

      case 'profile': {
        const profile = await gmail.users.getProfile({
          userId: 'me',
        })

        return NextResponse.json({
          success: true,
          profile: {
            emailAddress: profile.data.emailAddress,
            messagesTotal: profile.data.messagesTotal,
            threadsTotal: profile.data.threadsTotal,
            historyId: profile.data.historyId,
          },
        })
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error: any) {
    console.error("Gmail GET Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch emails" },
      { status: 500 }
    )
  }
}

// POST: Send email
export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const gmail = await getGmailClient(userId)
    const body = await request.json()
    const { action = 'send' } = body

    switch (action) {
      case 'send': {
        const { to, cc, bcc, subject, bodyText, bodyHtml, replyTo, inReplyTo, references } = body

        if (!to || !subject) {
          return NextResponse.json({ error: "to and subject are required" }, { status: 400 })
        }

        // Get sender's email
        const profile = await gmail.users.getProfile({ userId: 'me' })
        const fromEmail = profile.data.emailAddress

        // Build email headers
        const headers = [
          `From: ${fromEmail}`,
          `To: ${Array.isArray(to) ? to.join(', ') : to}`,
        ]

        if (cc) headers.push(`Cc: ${Array.isArray(cc) ? cc.join(', ') : cc}`)
        if (bcc) headers.push(`Bcc: ${Array.isArray(bcc) ? bcc.join(', ') : bcc}`)
        if (replyTo) headers.push(`Reply-To: ${replyTo}`)
        if (inReplyTo) headers.push(`In-Reply-To: ${inReplyTo}`)
        if (references) headers.push(`References: ${references}`)

        headers.push(`Subject: ${subject}`)
        headers.push('MIME-Version: 1.0')

        let emailContent: string

        if (bodyHtml) {
          // Multipart email with HTML
          const boundary = `boundary_${Date.now()}`
          headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`)
          
          emailContent = [
            headers.join('\r\n'),
            '',
            `--${boundary}`,
            'Content-Type: text/plain; charset=UTF-8',
            '',
            bodyText || '',
            `--${boundary}`,
            'Content-Type: text/html; charset=UTF-8',
            '',
            bodyHtml,
            `--${boundary}--`,
          ].join('\r\n')
        } else {
          // Plain text email
          headers.push('Content-Type: text/plain; charset=UTF-8')
          emailContent = [headers.join('\r\n'), '', bodyText || ''].join('\r\n')
        }

        // Encode to base64url
        const encodedMessage = Buffer.from(emailContent)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '')

        const sent = await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodedMessage,
            threadId: body.threadId, // For replies
          },
        })

        return NextResponse.json({
          success: true,
          message: {
            id: sent.data.id,
            threadId: sent.data.threadId,
            labelIds: sent.data.labelIds,
          },
        })
      }

      case 'draft': {
        const { to, cc, bcc, subject, bodyText, bodyHtml } = body

        // Get sender's email
        const profile = await gmail.users.getProfile({ userId: 'me' })
        const fromEmail = profile.data.emailAddress

        // Build email
        const headers = [
          `From: ${fromEmail}`,
          `To: ${Array.isArray(to) ? to.join(', ') : to || ''}`,
        ]

        if (cc) headers.push(`Cc: ${Array.isArray(cc) ? cc.join(', ') : cc}`)
        if (bcc) headers.push(`Bcc: ${Array.isArray(bcc) ? bcc.join(', ') : bcc}`)
        headers.push(`Subject: ${subject || ''}`)
        headers.push('MIME-Version: 1.0')
        headers.push('Content-Type: text/plain; charset=UTF-8')

        const emailContent = [headers.join('\r\n'), '', bodyText || bodyHtml || ''].join('\r\n')

        const encodedMessage = Buffer.from(emailContent)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '')

        const draft = await gmail.users.drafts.create({
          userId: 'me',
          requestBody: {
            message: {
              raw: encodedMessage,
            },
          },
        })

        return NextResponse.json({
          success: true,
          draft: {
            id: draft.data.id,
            messageId: draft.data.message?.id,
          },
        })
      }

      case 'reply': {
        const { messageId, bodyText, bodyHtml } = body

        if (!messageId) {
          return NextResponse.json({ error: "messageId required for reply" }, { status: 400 })
        }

        // Get original message
        const original = await gmail.users.messages.get({
          userId: 'me',
          id: messageId,
          format: 'full',
        })

        const headers = original.data.payload?.headers || []
        const getHeader = (name: string) =>
          headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || ''

        const originalFrom = getHeader('From')
        const originalSubject = getHeader('Subject')
        const originalMessageId = getHeader('Message-ID')
        const originalReferences = getHeader('References')

        // Get sender's email
        const profile = await gmail.users.getProfile({ userId: 'me' })
        const fromEmail = profile.data.emailAddress

        // Build reply headers
        const replyHeaders = [
          `From: ${fromEmail}`,
          `To: ${originalFrom}`,
          `Subject: ${originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`}`,
          `In-Reply-To: ${originalMessageId}`,
          `References: ${originalReferences ? `${originalReferences} ${originalMessageId}` : originalMessageId}`,
          'MIME-Version: 1.0',
          'Content-Type: text/plain; charset=UTF-8',
        ]

        const emailContent = [replyHeaders.join('\r\n'), '', bodyText || bodyHtml || ''].join('\r\n')

        const encodedMessage = Buffer.from(emailContent)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '')

        const sent = await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodedMessage,
            threadId: original.data.threadId,
          },
        })

        return NextResponse.json({
          success: true,
          message: {
            id: sent.data.id,
            threadId: sent.data.threadId,
          },
        })
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error: any) {
    console.error("Gmail POST Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to send email" },
      { status: 500 }
    )
  }
}

// PATCH: Modify email (labels, read status, archive, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const gmail = await getGmailClient(userId)
    const body = await request.json()
    const { messageId, action, labelIds, addLabelIds, removeLabelIds } = body

    if (!messageId) {
      return NextResponse.json({ error: "messageId required" }, { status: 400 })
    }

    switch (action) {
      case 'markRead': {
        await gmail.users.messages.modify({
          userId: 'me',
          id: messageId,
          requestBody: {
            removeLabelIds: ['UNREAD'],
          },
        })
        return NextResponse.json({ success: true, action: 'marked as read' })
      }

      case 'markUnread': {
        await gmail.users.messages.modify({
          userId: 'me',
          id: messageId,
          requestBody: {
            addLabelIds: ['UNREAD'],
          },
        })
        return NextResponse.json({ success: true, action: 'marked as unread' })
      }

      case 'star': {
        await gmail.users.messages.modify({
          userId: 'me',
          id: messageId,
          requestBody: {
            addLabelIds: ['STARRED'],
          },
        })
        return NextResponse.json({ success: true, action: 'starred' })
      }

      case 'unstar': {
        await gmail.users.messages.modify({
          userId: 'me',
          id: messageId,
          requestBody: {
            removeLabelIds: ['STARRED'],
          },
        })
        return NextResponse.json({ success: true, action: 'unstarred' })
      }

      case 'archive': {
        await gmail.users.messages.modify({
          userId: 'me',
          id: messageId,
          requestBody: {
            removeLabelIds: ['INBOX'],
          },
        })
        return NextResponse.json({ success: true, action: 'archived' })
      }

      case 'moveToInbox': {
        await gmail.users.messages.modify({
          userId: 'me',
          id: messageId,
          requestBody: {
            addLabelIds: ['INBOX'],
          },
        })
        return NextResponse.json({ success: true, action: 'moved to inbox' })
      }

      case 'trash': {
        await gmail.users.messages.trash({
          userId: 'me',
          id: messageId,
        })
        return NextResponse.json({ success: true, action: 'trashed' })
      }

      case 'untrash': {
        await gmail.users.messages.untrash({
          userId: 'me',
          id: messageId,
        })
        return NextResponse.json({ success: true, action: 'untrashed' })
      }

      case 'modifyLabels': {
        await gmail.users.messages.modify({
          userId: 'me',
          id: messageId,
          requestBody: {
            addLabelIds: addLabelIds || [],
            removeLabelIds: removeLabelIds || [],
          },
        })
        return NextResponse.json({ success: true, action: 'labels modified' })
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error: any) {
    console.error("Gmail PATCH Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to modify email" },
      { status: 500 }
    )
  }
}

// DELETE: Permanently delete email
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const gmail = await getGmailClient(userId)
    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('messageId')

    if (!messageId) {
      return NextResponse.json({ error: "messageId required" }, { status: 400 })
    }

    await gmail.users.messages.delete({
      userId: 'me',
      id: messageId,
    })

    return NextResponse.json({
      success: true,
      message: 'Email permanently deleted',
    })
  } catch (error: any) {
    console.error("Gmail DELETE Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete email" },
      { status: 500 }
    )
  }
}
