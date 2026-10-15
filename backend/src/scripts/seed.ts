import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[Prisma Seed] Seeding database with demo records...');

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('password123', salt);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@vestinex.io' },
    update: {},
    create: {
      email: 'admin@vestinex.io',
      name: 'Sarah Chen (Platform Lead)',
      passwordHash,
      role: 'ADMIN',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    },
  });

  const dev = await prisma.user.upsert({
    where: { email: 'dev@vestinex.io' },
    update: {},
    create: {
      email: 'dev@vestinex.io',
      name: 'Alex Rivera (Staff SRE)',
      passwordHash,
      role: 'USER',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
  });

  const project = await prisma.project.create({
    data: {
      name: 'Checkout & Payment Engine',
      description: 'High-throughput transactional billing and distributed payment settlement pipeline.',
      repoUrl: 'https://github.com/S-T-HARINI/VestiNex.git',
      environment: 'PRODUCTION',
      status: 'ACTIVE',
      members: {
        create: [
          { userId: admin.id, role: 'OWNER' },
          { userId: dev.id, role: 'ADMIN' },
        ],
      },
    },
  });

  console.log(`[Prisma Seed] Seeded project: ${project.name} (${project.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
