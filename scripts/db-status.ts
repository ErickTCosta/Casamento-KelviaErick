import { PrismaClient } from "@prisma/client";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

async function main() {
  const [invites, people, gifts, settings, adminAccounts] = await Promise.all([
    prisma.invite.count(),
    prisma.person.count(),
    prisma.gift.count(),
    prisma.setting.count(),
    prisma.adminUser.count(),
  ]);
  const rls = await prisma.$queryRaw<
    { relname: string; relrowsecurity: boolean }[]
  >`
    SELECT relname, relrowsecurity
    FROM pg_class
    WHERE relnamespace = 'public'::regnamespace
      AND relname IN ('Setting', 'AdminUser', 'Invite', 'Person', 'Gift')
    ORDER BY relname
  `;

  console.log(
    JSON.stringify(
      {
        counts: { invites, people, gifts, settings, adminAccounts },
        rowLevelSecurity: rls,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error: unknown) => {
    console.error("Falha ao verificar o banco de dados.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
