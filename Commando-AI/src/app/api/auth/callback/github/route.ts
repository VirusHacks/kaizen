import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  
  // Detect base URL dynamically
  const protocol = req.headers.get('x-forwarded-proto') || req.nextUrl.protocol.replace(':', '')
  const host = req.headers.get('host') || req.nextUrl.host
  const baseUrl = process.env.NEXT_PUBLIC_URL || `${protocol}://${host}`

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/connections?error=no_code`)
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID!,
        client_secret: process.env.GITHUB_CLIENT_SECRET!,
        code,
        redirect_uri: process.env.GITHUB_REDIRECT_URI!,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      console.error('GitHub OAuth error:', tokenData.error)
      return NextResponse.redirect(`${baseUrl}/connections?error=github_auth_failed`)
    }

    const accessToken = tokenData.access_token

    // Get user information
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    })

    const userData = await userResponse.json()

    if (!userData.login) {
      console.error('Failed to get GitHub user data')
      return NextResponse.redirect(`${baseUrl}/connections?error=github_user_failed`)
    }

    const username = userData.login

    return NextResponse.redirect(
      `${baseUrl}/connections?github_access_token=${accessToken}&github_username=${username}`
    )
  } catch (error) {
    console.error('GitHub OAuth error:', error)
    return NextResponse.redirect(`${baseUrl}/connections?error=github_auth_failed`)
  }
}
