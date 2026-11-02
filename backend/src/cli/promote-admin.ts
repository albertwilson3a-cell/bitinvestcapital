/**
 * Grants the ADMIN role to an existing, verified account.
 *   npm run admin:promote -- ops@bitinvestcapital.com
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole } from '../generated/prisma/client.js';

try {
  process.loadEnvFile('.env');
} catch {
  // Rely on the process environment (e.g. in containers).
}

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('Usage: npm run admin:promote -- <email>');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
try {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`No account for ${email}`);
  if (!user.isVerified) throw new Error(`${email} has not verified their email yet`);
  if (user.role === UserRole.ADMIN) {
    console.log(`${email} is already an admin`);
  } else {
    await prisma.user.update({ where: { id: user.id }, data: { role: UserRole.ADMIN } });
    console.log(`${email} is now an admin. It takes effect on their next request (roles are re-read on every request).`);
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
