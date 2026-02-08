import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedOctokit } from '@/lib/github-helpers'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ owner: string; repo: string }> }

/**
 * GET /api/github/repos/[owner]/[repo]/contents
 * Get repository contents (files/folders) at a given path.
 * Supports ?path=src/lib&ref=main
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const result = await getAuthenticatedOctokit()
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const { owner, repo } = await params
    const { searchParams } = new URL(req.url)
    const path = searchParams.get('path') || ''
    const ref = searchParams.get('ref') || undefined

    const { data } = await result.octokit.repos.getContent({
      owner,
      repo,
      path,
      ...(ref ? { ref } : {}),
    })

    return NextResponse.json({ contents: data })
  } catch (error: any) {
    console.error('[GITHUB_CONTENTS_GET]', error)
    if (error?.status === 404) {
      return NextResponse.json({ error: 'Path not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to fetch contents' }, { status: 500 })
  }
}

/**
 * PUT /api/github/repos/[owner]/[repo]/contents
 * Create or update a file in a repository (creates a commit).
 * Body: { path, message, content (plain text), branch?, sha? (required for updates) }
 */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const result = await getAuthenticatedOctokit()
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const { owner, repo } = await params
    const body = await req.json()
    const { path, message, content, branch, sha } = body

    if (!path || !message || content === undefined) {
      return NextResponse.json(
        { error: 'path, message, and content are required' },
        { status: 400 }
      )
    }

    const encodedContent = Buffer.from(content).toString('base64')

    const { data } = await result.octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: encodedContent,
      ...(branch ? { branch } : {}),
      ...(sha ? { sha } : {}),
    })

    return NextResponse.json({ file: data }, { status: sha ? 200 : 201 })
  } catch (error) {
    console.error('[GITHUB_CONTENTS_PUT]', error)
    return NextResponse.json({ error: 'Failed to create/update file' }, { status: 500 })
  }
}

/**
 * DELETE /api/github/repos/[owner]/[repo]/contents
 * Delete a file from a repository.
 * Body: { path, message, sha, branch? }
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const result = await getAuthenticatedOctokit()
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const { owner, repo } = await params
    const body = await req.json()
    const { path, message, sha, branch } = body

    if (!path || !message || !sha) {
      return NextResponse.json(
        { error: 'path, message, and sha are required' },
        { status: 400 }
      )
    }

    const { data } = await result.octokit.repos.deleteFile({
      owner,
      repo,
      path,
      message,
      sha,
      ...(branch ? { branch } : {}),
    })

    return NextResponse.json({ result: data })
  } catch (error) {
    console.error('[GITHUB_CONTENTS_DELETE]', error)
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
  }
}
