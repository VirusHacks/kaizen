import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { currentUser } from '@clerk/nextjs'
import bcrypt from 'bcryptjs'
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

    const { projectId, memberId, password, departmentRole } = await req.json()

    if (!projectId || !memberId || !password || !departmentRole) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Find the project member with matching memberId
    const projectMember = await db.projectMember.findFirst({
      where: {
        projectId,
        userId: user.id,
        memberId,
      },
      include: {
        project: true,
      },
    })

    if (!projectMember) {
      return NextResponse.json(
        { error: 'Invalid member ID or access denied' },
        { status: 403 }
      )
    }

    // Verify password
    if (!projectMember.password) {
      return NextResponse.json(
        { error: 'No password set for this member' },
        { status: 403 }
      )
    }

    const isPasswordValid = await bcrypt.compare(password, projectMember.password)
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 403 }
      )
    }

    // Update the department role for this member
    await db.projectMember.update({
      where: {
        id: projectMember.id,
      },
      data: {
        departmentRole,
      },
    })

    // Set cookie for project access
    const cookieStore = await cookies()
    cookieStore.set(
      `project_role_${projectId}`,
      departmentRole,
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
      role: departmentRole,
    })
  } catch (error) {
    console.error('Project access error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
