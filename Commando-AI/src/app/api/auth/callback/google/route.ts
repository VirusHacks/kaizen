import { clerkClient } from "@clerk/nextjs/server"
import { OAuth2Client } from "google-auth-library"
import { NextRequest, NextResponse } from "next/server"

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state") // This is the userId we passed earlier
  
  // Detect base URL dynamically
  const protocol = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '')
  const host = request.headers.get('host') || request.nextUrl.host
  const baseUrl = process.env.NEXT_PUBLIC_URL || `${protocol}://${host}`

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/connections?error=missing_code`)
  }

  try {
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // Store tokens in Clerk user metadata
    const client = await clerkClient()
    await client.users.updateUser(state, {
      privateMetadata: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token,
      },
    })

    return NextResponse.redirect(`${baseUrl}/connections?google_connected=true`)
  } catch (error) {
    console.error("Error in Google OAuth callback:", error)
    return NextResponse.redirect(`${baseUrl}/connections?error=google_auth_failed`)
  }
}
