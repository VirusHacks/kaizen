import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * Verify what permissions the stored GitHub token actually has.
 * Tests a few key operations to determine access level.
 */
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const github = await db.gitHub.findFirst({ where: { userId } })
    if (!github) {
      return NextResponse.json({ error: 'GitHub not connected' }, { status: 400 })
    }

    const headers = {
      Authorization: `Bearer ${github.accessToken}`,
      Accept: 'application/vnd.github.v3+json',
    }

    const results: Record<string, { ok: boolean; detail?: string }> = {}

    // 1. Test authentication
    const userResp = await fetch('https://api.github.com/user', { headers })
    results.authentication = {
      ok: userResp.ok,
      detail: userResp.ok ? (await userResp.json()).login : `Status ${userResp.status}`,
    }

    // 2. Test listing repos
    const reposResp = await fetch('https://api.github.com/user/repos?per_page=1', { headers })
    results.listRepos = {
      ok: reposResp.ok,
      detail: reposResp.ok ? 'Can list repositories' : `Status ${reposResp.status}`,
    }

    // 3. Test repo creation permission (dry-run: create then immediately delete)
    const testName = `__perm-verify-${Date.now()}`
    const createResp = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: testName, private: true, auto_init: false }),
    })

    if (createResp.ok) {
      const created = await createResp.json()
      results.createRepo = { ok: true, detail: 'Can create repositories' }
      // Clean up test repo
      await fetch(`https://api.github.com/repos/${created.full_name}`, {
        method: 'DELETE',
        headers,
      })
    } else {
      const err = await createResp.json()
      results.createRepo = {
        ok: false,
        detail: err.message || `Status ${createResp.status}`,
      }
    }

    // 4. Check token type
    const scopes = userResp.headers.get('x-oauth-scopes')
    const tokenPrefix = github.accessToken.substring(0, 4)
    let tokenType = 'unknown'
    if (tokenPrefix === 'ghu_') tokenType = 'GitHub App user-to-server'
    else if (tokenPrefix === 'gho_') tokenType = 'OAuth App'
    else if (tokenPrefix === 'ghp_') tokenType = 'Personal Access Token'

    const allOk = Object.values(results).every((r) => r.ok)

    return NextResponse.json({
      ok: allOk,
      tokenType,
      scopes: scopes || '(none — permissions from GitHub App config)',
      username: github.username,
      permissions: results,
      ...(allOk
        ? {}
        : {
            fix: tokenType === 'GitHub App user-to-server'
              ? 'Your GitHub App needs additional permissions. Go to https://github.com/settings/apps/kaizen-commando-ai/permissions and enable: Repository permissions → Administration (Read & write), Contents (Read & write), Issues (Read & write), Pull requests (Read & write), Metadata (Read). Then reinstall the app and reconnect.'
              : 'Please disconnect and reconnect GitHub to get a fresh token with proper scopes.',
          }),
    })
  } catch (error) {
    console.error('[GITHUB_VERIFY_PERMISSIONS]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
