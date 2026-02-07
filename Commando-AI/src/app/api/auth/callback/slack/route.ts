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
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        redirect_uri: process.env.SLACK_REDIRECT_URI!,
      }),
    })

    const data = await response.json()

    if (!data.ok) {
      console.error('Slack OAuth error:', data.error)
      return NextResponse.redirect(`${baseUrl}/connections?error=slack_auth_failed`)
    }

    const appId = data?.app_id
    const userId = data?.authed_user?.id
    const userToken = data?.authed_user?.access_token
    const accessToken = data?.access_token
    const botUserId = data?.bot_user_id
    const teamId = data?.team?.id
    const teamName = data?.team?.name

    return NextResponse.redirect(
      `${baseUrl}/connections?app_id=${appId}&authed_user_id=${userId}&authed_user_token=${userToken}&slack_access_token=${accessToken}&bot_user_id=${botUserId}&team_id=${teamId}&team_name=${encodeURIComponent(teamName)}`
    )
  } catch (error) {
    console.error('Slack OAuth error:', error)
    return NextResponse.redirect(`${baseUrl}/connections?error=slack_auth_failed`)
  }
}
