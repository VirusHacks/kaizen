import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedOctokit } from '@/lib/github-helpers'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ owner: string; repo: string }> }

/**
 * GET /api/github/repos/[owner]/[repo]/labels
 * List labels for a repository.
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const result = await getAuthenticatedOctokit()
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const { owner, repo } = await params
    const { data } = await result.octokit.issues.listLabelsForRepo({
      owner,
      repo,
      per_page: 100,
    })

    return NextResponse.json({ labels: data })
  } catch (error) {
    console.error('[GITHUB_LABELS_GET]', error)
    return NextResponse.json({ error: 'Failed to fetch labels' }, { status: 500 })
  }
}

/**
 * POST /api/github/repos/[owner]/[repo]/labels
 * Create a label.
 * Body: { name: string, color: string (hex without #), description?: string }
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const result = await getAuthenticatedOctokit()
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const { owner, repo } = await params
    const body = await req.json()
    const { name, color, description } = body

    if (!name || !color) {
      return NextResponse.json({ error: 'name and color are required' }, { status: 400 })
    }

    const { data } = await result.octokit.issues.createLabel({
      owner,
      repo,
      name,
      color: color.replace('#', ''),
      description,
    })

    return NextResponse.json({ label: data }, { status: 201 })
  } catch (error) {
    console.error('[GITHUB_LABELS_POST]', error)
    return NextResponse.json({ error: 'Failed to create label' }, { status: 500 })
  }
}
