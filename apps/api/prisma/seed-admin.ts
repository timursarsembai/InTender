import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as readline from 'readline';

const prisma = new PrismaClient();

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  const email = process.env.ADMIN_EMAIL || await prompt('Admin email: ');
  const password = process.env.ADMIN_PASSWORD || await prompt('Admin password: ');

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role === 'ADMIN') {
      console.log(`✅ Admin already exists: ${email}`);
    } else {
      await prisma.user.update({ where: { email }, data: { role: 'ADMIN' } });
      console.log(`✅ Updated user ${email} to ADMIN`);
    }
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { email, passwordHash, role: 'ADMIN' },
  });

  console.log(`✅ Admin created: ${email}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
