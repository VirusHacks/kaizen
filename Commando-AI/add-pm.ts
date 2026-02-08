import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addPM() {
  const projectId = '39fd33b9-e515-4f41-ac40-31a543f1673a';
  const email = 'virustechhacks@gmail.com';
  
  // Find or create user
  let user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    user = await prisma.user.create({
      data: {
        clerkId: 'user_pm_' + Date.now(),
        email,
        name: 'Project Manager',
      }
    });
    console.log('✅ Created user:', user.email);
  } else {
    console.log('⏭️  User exists:', user.email, 'clerkId:', user.clerkId);
  }
  
  // Add as project member with ADMIN role
  const existing = await prisma.projectMember.findFirst({
    where: { projectId, userId: user.clerkId }
  });
  
  if (!existing) {
    await prisma.projectMember.create({
      data: {
        projectId,
        userId: user.clerkId,
        role: 'ADMIN'
      }
    });
    console.log('✅ Added as Project Manager (ADMIN) to E-Commerce Platform Redesign');
  } else {
    console.log('⏭️  Already a project member with role:', existing.role);
  }
  
  console.log('\n📌 Project URL:');
  console.log(`   http://localhost:3000/projects/${projectId}/project-manager/dashboard`);
  
  await prisma.$disconnect();
}

addPM();
