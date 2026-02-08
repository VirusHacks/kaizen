import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { isGitHubAppConfigured, getOAuthUrl, getInstallationUrl } from '@/lib/github-app'

export const dynamic = 'force-dynamic'

/**
 * GET /api/github/status
 * Get the user's GitHub connection status — is it connected, does it have an installation, etc.
 * Used by client components to render connection state.
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const github = await db.gitHub.findFirst({
      where: { userId },
    })

    if (!github) {
      return NextResponse.json({
        connected: false,
        hasInstallation: false,
        isAppConfigured: isGitHubAppConfigured(),
        connectUrl: getOAuthUrl(),
      })
    }

    let installUrl: string | null = null
    try {
      installUrl = isGitHubAppConfigured() ? getInstallationUrl() : null
    } catch {
      // GITHUB_APP_SLUG not set
    }

    return NextResponse.json({
      connected: true,
      username: github.username,
      hasInstallation: !!github.installationId,
      installationId: github.installationId,
      isAppConfigured: isGitHubAppConfigured(),
      installUrl,
    })
  } catch (error) {
    console.error('[GITHUB_STATUS_GET]', error)
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 })
  }
}
