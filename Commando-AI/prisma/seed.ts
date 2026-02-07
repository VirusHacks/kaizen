import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Get the first user (you)
  const user = await prisma.user.findFirst()
  if (!user) {
    console.log('❌ No users found. Please create a user first.')
    return
  }

  console.log(`✅ Found user: ${user.email}`)

  // Get the first project
  const project = await prisma.project.findFirst({
    where: { ownerId: user.clerkId },
  })

  if (!project) {
    console.log('❌ No projects found. Please create a project first.')
    return
  }

  console.log(`✅ Found project: ${project.name} (${project.key})`)

  // Define member credentials for each role
  const memberCredentials = [
    {
      memberId: 'DEV001',
      password: 'dev123',
      departmentRole: 'DEVELOPER',
      roleName: 'Developer',
    },
    {
      memberId: 'QA001',
      password: 'qa123',
      departmentRole: 'QA_TESTER',
      roleName: 'QA Tester',
    },
    {
      memberId: 'FIN001',
      password: 'fin123',
      departmentRole: 'FINANCE',
      roleName: 'Finance',
    },
    {
      memberId: 'SALES001',
      password: 'sales123',
      departmentRole: 'SALES',
      roleName: 'Sales',
    },
    {
      memberId: 'EXEC001',
      password: 'exec123',
      departmentRole: 'EXECUTIVE',
      roleName: 'Executive',
    },
    {
      memberId: 'PM001',
      password: 'pm123',
      departmentRole: 'PROJECT_MANAGER',
      roleName: 'Project Manager',
    },
  ]

  console.log('\n🔐 Creating member credentials...\n')

  for (const cred of memberCredentials) {
    const hashedPassword = await bcrypt.hash(cred.password, 10)

    const member = await prisma.projectMember.upsert({
      where: {
        projectId_memberId: {
          projectId: project.id,
          memberId: cred.memberId,
        },
      },
      update: {
        userId: user.clerkId,
        password: hashedPassword,
        departmentRole: cred.departmentRole as any,
      },
      create: {
        projectId: project.id,
        userId: user.clerkId,
        memberId: cred.memberId,
        password: hashedPassword,
        departmentRole: cred.departmentRole as any,
        role: 'MEMBER',
      },
    })

    console.log(`✅ ${cred.roleName}:`)
    console.log(`   Member ID: ${cred.memberId}`)
    console.log(`   Password: ${cred.password}`)
    console.log(`   Role: ${cred.departmentRole}\n`)
  }

  console.log('✅ Seed completed successfully!')
  console.log('\n📋 Summary:')
  console.log(`   Project: ${project.name} (${project.key})`)
  console.log(`   User: ${user.email}`)
  console.log(`   Members created: ${memberCredentials.length}`)
  console.log('\n🔑 Use these credentials to access the project:')
  console.log('   Developer: DEV001 / dev123')
  console.log('   QA Tester: QA001 / qa123')
  console.log('   Finance: FIN001 / fin123')
  console.log('   Sales: SALES001 / sales123')
  console.log('   Executive: EXEC001 / exec123')
  console.log('   Project Manager: PM001 / pm123')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
