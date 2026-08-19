import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Clearing database...');
  await prisma.auditLog.deleteMany();
  await prisma.consent.deleteMany();
  await prisma.clientApp.deleteMany();
  await prisma.user.deleteMany();

  console.log('🌱 Seeding data...');

  // Create default user
  const alice = await prisma.user.create({
    data: {
      name: 'Alice Johnson',
      email: 'alice@example.com',
    },
  });

  // Create FitPulse Pro app
  const fitpulse = await prisma.clientApp.create({
    data: {
      name: 'FitPulse Pro',
      description: 'Your AI-powered health companion that tracks vitals, activity, and wellness trends to help you live healthier.',
      clientId: 'fitpulse-pro',
      defaultScopes: JSON.stringify([
        'read:health:metrics',
        'read:health:steps',
        'read:health:sleep',
      ]),
    },
  });

  // Create RoutePlanner app
  const routeplanner = await prisma.clientApp.create({
    data: {
      name: 'RoutePlanner',
      description: 'Smart navigation and commute optimization app that personalizes routes based on your location history and preferences.',
      clientId: 'routeplanner',
      defaultScopes: JSON.stringify([
        'read:location:current',
        'read:location:history',
      ]),
    },
  });

  console.log(`✅ Created user: ${alice.name}`);
  console.log(`✅ Created app: ${fitpulse.name} (clientId: ${fitpulse.clientId})`);
  console.log(`✅ Created app: ${routeplanner.name} (clientId: ${routeplanner.clientId})`);
  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
