import { clerkClient } from "@clerk/nextjs/server"
import { OAuth2Client } from "google-auth-library"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state") // This should be the userId we passed earlier
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://localhost:3000'

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/connections?error=missing_code`)
  }

  // Initialize OAuth2Client inside the request handler
  const redirectUri = process.env.GOOGLE_REDIRECT_URI
  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri,
  )

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

    // Redirect to connections page after successful connection
    return NextResponse.redirect(`${baseUrl}/connections?google_connected=true`)
  } catch (error) {
    console.error("Error in Google OAuth callback:", error)
    return NextResponse.redirect(`${baseUrl}/connections?error=google_auth_failed`)
  }
}

