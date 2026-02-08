import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getProjectId() {
  const project = await prisma.project.findUnique({
    where: { key: 'ECP' },
    include: {
      _count: {
        select: {
          issues: true,
          sprints: true,
          velocitySnapshots: true,
          resourceAllocations: true,
          agentProfiles: true,
        },
      },
    },
  });

  if (project) {
    console.log('\n🎯 E-Commerce Platform Redesign (ECP) Project Details:\n');
    console.log(`Project ID: ${project.id}`);
    console.log(`Name: ${project.name}`);
    console.log(`Description: ${project.description}\n`);
    console.log(`📊 Data Summary:`);
    console.log(`   - ${project._count.issues} issues`);
    console.log(`   - ${project._count.sprints} sprints`);
    console.log(`   - ${project._count.velocitySnapshots} velocity snapshots`);
    console.log(`   - ${project._count.resourceAllocations} resource allocations`);
    console.log(`   - ${project._count.agentProfiles} AI agents\n`);
    console.log(`🔗 Quick Links:`);
    console.log(`   Dashboard: http://localhost:3000/projects/${project.id}/project-manager/dashboard`);
    console.log(`   Delivery Engine: http://localhost:3000/projects/${project.id}/project-manager/delivery-engine`);
    console.log(`   Agent Collaboration: http://localhost:3000/projects/${project.id}/project-manager/agent-collaboration\n`);
  } else {
    console.log('❌ Project not found');
  }

  await prisma.$disconnect();
}

getProjectId();
