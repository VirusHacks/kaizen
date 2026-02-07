import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { currentUser } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { projectId } = await req.json()

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing project ID' },
        { status: 400 }
      )
    }

    // Look up the user's membership in this project by their Clerk ID
    const projectMember = await db.projectMember.findFirst({
      where: {
        projectId,
        userId: user.id,
      },
      include: {
        project: true,
      },
    })

    if (!projectMember) {
      // Also check if the user is the project owner
      const project = await db.project.findFirst({
        where: {
          id: projectId,
          ownerId: user.id,
        },
      })

      if (project) {
        // Owner without a membership row — default to PROJECT_MANAGER
        const role = 'PROJECT_MANAGER'

        const cookieStore = await cookies()
        cookieStore.set(
          `project_role_${projectId}`,
          role,
          {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
          }
        )

        return NextResponse.json({
          success: true,
          message: 'Access granted',
          role,
        })
      }

      return NextResponse.json(
        { error: 'You are not a member of this project' },
        { status: 403 }
      )
    }

    const role = projectMember.departmentRole || 'PROJECT_MANAGER'

    // Set cookie for project access
    const cookieStore = await cookies()
    cookieStore.set(
      `project_role_${projectId}`,
      role,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Access granted',
      role,
    })
  } catch (error) {
    console.error('Project access error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
