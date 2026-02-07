import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { currentUser } from '@clerk/nextjs/server'
import bcrypt from 'bcryptjs'

/**
 * API route to create or update a project member with credentials
 * POST /api/projects/members/setup
 * 
 * Body:
 * {
 *   projectId: string,
 *   userId: string (clerkId of the user),
 *   memberId: string (custom member ID),
 *   password: string,
 *   departmentRole?: DepartmentRole (optional)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { projectId, userId, memberId, password, departmentRole } = await req.json()

    if (!projectId || !userId || !memberId || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, userId, memberId, password' },
        { status: 400 }
      )
    }

    // Verify the current user is the project owner
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    if (project.ownerId !== user.id) {
      return NextResponse.json(
        { error: 'Only project owners can set up member credentials' },
        { status: 403 }
      )
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Check if the project member already exists by memberId
    const existingMember = await db.projectMember.findFirst({
      where: {
        projectId,
        memberId,
      },
    })

    let projectMember

    if (existingMember && existingMember.userId !== userId) {
      return NextResponse.json(
        { error: 'Member ID is already in use' },
        { status: 409 }
      )
    }

    if (existingMember) {
      // Update existing member
      projectMember = await db.projectMember.update({
        where: { id: existingMember.id },
        data: {
          userId,
          password: hashedPassword,
          ...(departmentRole && { departmentRole }),
        },
      })
    } else {
      // Create new member
      projectMember = await db.projectMember.create({
        data: {
          projectId,
          userId,
          memberId,
          password: hashedPassword,
          ...(departmentRole && { departmentRole }),
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Member credentials set up successfully',
      member: {
        id: projectMember.id,
        memberId: projectMember.memberId,
        role: projectMember.role,
        departmentRole: projectMember.departmentRole,
      },
    })
  } catch (error) {
    console.error('Setup member error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
