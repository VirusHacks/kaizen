import { auth } from "@clerk/nextjs/server"
import { OAuth2Client } from "google-auth-library"
import { NextResponse } from "next/server"

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET() {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'))
  }

  // Initialize OAuth2Client inside the request handler to ensure env vars are loaded
  const redirectUri = process.env.GOOGLE_REDIRECT_URI
  
  if (!redirectUri) {
    console.error('GOOGLE_REDIRECT_URI is not set')
    return NextResponse.json({ error: 'OAuth configuration error' }, { status: 500 })
  }

  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri,
  )

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.compose",
      "https://www.googleapis.com/auth/gmail.modify"
    ],
    state: userId,
    prompt: "consent",
    redirect_uri: redirectUri, // Explicitly set redirect_uri in the auth URL
  })

  console.log('Google OAuth redirect URI:', redirectUri)
  console.log('Generated auth URL:', authUrl)

  return NextResponse.redirect(authUrl)
}

