import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedVelocityData() {
  console.log('🌱 Seeding velocity data for Predictive Delivery Engine...\n');

  // Get first project
  const project = await prisma.project.findFirst();
  
  if (!project) {
    console.log('❌ No project found. Please create a project first.');
    process.exit(1);
  }

  console.log(`📊 Project: ${project.name} (${project.id})\n`);

  // Historical velocity data (last 8 weeks)
  // This simulates realistic team velocity with some variance
  const velocityData = [
    { points: 22, tasks: 11, utilization: 0.75, burnout: 0.20 },
    { points: 24, tasks: 12, utilization: 0.80, burnout: 0.30 },
    { points: 18, tasks: 9, utilization: 0.70, burnout: 0.15 },
    { points: 26, tasks: 13, utilization: 0.85, burnout: 0.35 },
    { points: 20, tasks: 10, utilization: 0.75, burnout: 0.25 },
    { points: 23, tasks: 11, utilization: 0.78, burnout: 0.22 },
    { points: 25, tasks: 12, utilization: 0.82, burnout: 0.28 },
    { points: 21, tasks: 10, utilization: 0.74, burnout: 0.20 },
  ];

  // Create velocity snapshots for each week
  let created = 0;
  for (let i = 0; i < velocityData.length; i++) {
    const weekData = velocityData[i];
    
    // Calculate week start/end (going back from today)
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (8 - i) * 7);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    weekEnd.setHours(23, 59, 59, 999);

    try {
      await prisma.velocitySnapshot.create({
        data: {
          projectId: project.id,
          weekStart,
          weekEnd,
          storyPoints: weekData.points,
          tasksCompleted: weekData.tasks,
          teamSize: 5, // Assume 5-person team
          avgUtilization: weekData.utilization,
          avgBurnout: weekData.burnout,
        },
      });
      
      created++;
      console.log(`✅ Week ${i + 1}: ${weekStart.toLocaleDateString()} - ${weekData.points} story points`);
    } catch (error) {
      console.error(`❌ Failed to create snapshot for week ${i + 1}:`, error);
    }
  }

  console.log(`\n✨ Successfully created ${created} velocity snapshots!\n`);

  // Calculate and display velocity statistics
  const avgVelocity = velocityData.reduce((sum, d) => sum + d.points, 0) / velocityData.length;
  const minVelocity = Math.min(...velocityData.map(d => d.points));
  const maxVelocity = Math.max(...velocityData.map(d => d.points));
  
  console.log('📈 Velocity Statistics:');
  console.log(`   Average: ${avgVelocity.toFixed(1)} story points/week`);
  console.log(`   Range: ${minVelocity} - ${maxVelocity} story points`);
  console.log(`   Team Size: 5 developers`);
  console.log(`   Avg Utilization: ${(velocityData.reduce((s, d) => s + d.utilization, 0) / velocityData.length * 100).toFixed(0)}%`);
  console.log(`   Avg Burnout Risk: ${(velocityData.reduce((s, d) => s + d.burnout, 0) / velocityData.length * 100).toFixed(0)}%\n`);

  console.log('🎯 Next Steps:');
  console.log('   1. Run Monte Carlo predictions on your issues');
  console.log('   2. Navigate to: /projects/<projectId>/project-manager/delivery-engine');
  console.log('   3. View delivery predictions with confidence intervals\n');

  await prisma.$disconnect();
}

seedVelocityData()
  .catch((error) => {
    console.error('\n❌ Error seeding velocity data:', error);
    process.exit(1);
  });
