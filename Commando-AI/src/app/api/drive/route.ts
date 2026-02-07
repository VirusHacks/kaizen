import { google } from 'googleapis'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

// Helper to get OAuth client
async function getDriveClient(userId: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  
  const googleAccessToken = user.privateMetadata?.googleAccessToken as string | undefined
  const googleRefreshToken = user.privateMetadata?.googleRefreshToken as string | undefined
  
  if (!googleAccessToken) {
    const clerkResponse = await client.users.getUserOauthAccessToken(
      userId,
      'oauth_google'
    )

    if (!clerkResponse.data || clerkResponse.data.length === 0) {
      return null
    }
    
    oauth2Client.setCredentials({
      access_token: clerkResponse.data[0].token,
    })
  } else {
    oauth2Client.setCredentials({
      access_token: googleAccessToken,
      refresh_token: googleRefreshToken,
    })
    
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
  }

  return google.drive({
    version: 'v3',
    auth: oauth2Client,
  })
}

export async function GET(request: NextRequest) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const drive = await getDriveClient(userId)
    if (!drive) {
      return NextResponse.json(
        { error: 'Google Drive not connected' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'list'
    const fileId = searchParams.get('fileId')
    const folderId = searchParams.get('folderId')
    const query = searchParams.get('q')

    switch (action) {
      case 'get': {
        if (!fileId) {
          return NextResponse.json({ error: 'fileId required' }, { status: 400 })
        }
        const file = await drive.files.get({
          fileId,
          fields: 'id, name, mimeType, iconLink, webViewLink, createdTime, modifiedTime, size, parents',
        })
        return NextResponse.json({ success: true, file: file.data })
      }

      case 'list': {
        const response = await drive.files.list({
          pageSize: parseInt(searchParams.get('pageSize') || '50'),
          fields: 'files(id, name, mimeType, iconLink, webViewLink, createdTime, modifiedTime, size, parents)',
          orderBy: 'modifiedTime desc',
          q: query || undefined,
          ...(folderId ? { q: `'${folderId}' in parents` } : {}),
        })
        return NextResponse.json({ success: true, files: response.data.files || [] })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Drive GET error:', error)
    if (error?.code === 401) {
      return NextResponse.json(
        { error: 'Google Drive token expired. Please reconnect.' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch Drive files' },
      { status: 500 }
    )
  }
}

// POST: Create files/folders
export async function POST(request: NextRequest) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const drive = await getDriveClient(userId)
    if (!drive) {
      return NextResponse.json(
        { error: 'Google Drive not connected' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action = 'create', name, mimeType, parentId, content } = body

    switch (action) {
      case 'create': {
        if (!name) {
          return NextResponse.json({ error: 'name is required' }, { status: 400 })
        }

        const fileMetadata: any = {
          name,
          ...(parentId ? { parents: [parentId] } : {}),
        }

        if (mimeType === 'application/vnd.google-apps.folder') {
          // Create folder
          fileMetadata.mimeType = 'application/vnd.google-apps.folder'
          const folder = await drive.files.create({
            requestBody: fileMetadata,
            fields: 'id, name, mimeType, webViewLink, parents',
          })
          return NextResponse.json({ success: true, file: folder.data })
        } else {
          // Create file
          const file = await drive.files.create({
            requestBody: {
              ...fileMetadata,
              mimeType: mimeType || 'text/plain',
            },
            media: {
              mimeType: mimeType || 'text/plain',
              body: content || '',
            },
            fields: 'id, name, mimeType, webViewLink, parents',
          })
          return NextResponse.json({ success: true, file: file.data })
        }
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Drive POST error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to create file/folder' },
      { status: 500 }
    )
  }
}

// PATCH: Update files
export async function PATCH(request: NextRequest) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const drive = await getDriveClient(userId)
    if (!drive) {
      return NextResponse.json(
        { error: 'Google Drive not connected' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { fileId, name, parentId, content } = body

    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 })
    }

    const updateData: any = {}
    if (name) updateData.name = name
    if (parentId) updateData.addParents = [parentId]

    const file = await drive.files.update({
      fileId,
      requestBody: updateData,
      ...(content ? {
        media: {
          mimeType: 'text/plain',
          body: content,
        },
      } : {}),
      fields: 'id, name, mimeType, webViewLink, parents',
    })

    return NextResponse.json({ success: true, file: file.data })
  } catch (error: any) {
    console.error('Drive PATCH error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to update file' },
      { status: 500 }
    )
  }
}

// DELETE: Delete files/folders
export async function DELETE(request: NextRequest) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const drive = await getDriveClient(userId)
    if (!drive) {
      return NextResponse.json(
        { error: 'Google Drive not connected' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')

    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 })
    }

    await drive.files.delete({ fileId })
    return NextResponse.json({ success: true, message: 'File deleted' })
  } catch (error: any) {
    console.error('Drive DELETE error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to delete file' },
      { status: 500 }
    )
  }
}
