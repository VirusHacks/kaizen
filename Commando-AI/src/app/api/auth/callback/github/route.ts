import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForToken, getUserProfile, getUserInstallations } from '@/lib/github-app'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const installationId = req.nextUrl.searchParams.get('installation_id')
  const setupAction = req.nextUrl.searchParams.get('setup_action') // 'install' | 'update'

  // Detect base URL dynamically
  const protocol = req.headers.get('x-forwarded-proto') || req.nextUrl.protocol.replace(':', '')
  const host = req.headers.get('host') || req.nextUrl.host
  const baseUrl = process.env.NEXT_PUBLIC_URL || `${protocol}://${host}`

  // GitHub App installation callback (no code, just installation_id)
  // This happens when a user installs the app from GitHub Marketplace or the app page
  if (!code && installationId && setupAction) {
    return NextResponse.redirect(
      `${baseUrl}/connections?github_installation_id=${installationId}&github_setup_action=${setupAction}`
    )
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/connections?error=no_code`)
  }

  try {
    // Exchange code for access token using GitHub App OAuth
    const tokenResult = await exchangeCodeForToken(code)
    const accessToken = tokenResult.accessToken

    // Get user profile
    const userData = await getUserProfile(accessToken)

    if (!userData.login) {
      console.error('Failed to get GitHub user data')
      return NextResponse.redirect(`${baseUrl}/connections?error=github_user_failed`)
    }

    const username = userData.login

    // Try to get the user's installation of our app
    let detectedInstallationId = installationId || ''
    let appSlug = ''
    try {
      const installations = await getUserInstallations(accessToken)
      if (installations.length > 0) {
        // Use the first installation (most users will have one)
        detectedInstallationId = String(installations[0].id)
        appSlug = installations[0].app_slug || ''
      }
    } catch (err) {
      console.warn('[GITHUB_CALLBACK] Could not fetch installations:', err)
    }

    const params = new URLSearchParams({
      github_access_token: accessToken,
      github_username: username,
    })

    if (detectedInstallationId) {
      params.set('github_installation_id', detectedInstallationId)
    }
    if (appSlug) {
      params.set('github_app_slug', appSlug)
    }
    // Pass refresh token and expiry if present (GitHub App OAuth tokens expire)
    if (tokenResult.refreshToken) {
      params.set('github_refresh_token', tokenResult.refreshToken)
    }
    if (tokenResult.expiresIn) {
      params.set('github_token_expires_in', String(tokenResult.expiresIn))
    }

    return NextResponse.redirect(`${baseUrl}/connections?${params.toString()}`)
  } catch (error) {
    console.error('GitHub OAuth error:', error)
    return NextResponse.redirect(`${baseUrl}/connections?error=github_auth_failed`)
  }
}
