import { PrismaClient, RSVPStatus } from "@prisma/client";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

const guestList = [
  { principal: "Irene", companions: ["Francisco"] },
  { principal: "Rose", companions: [] },
  { principal: "Liduina", companions: ["Aureliano"] },
  { principal: "Rosa", companions: ["Helaine"] },
  { principal: "Tia Preta", companions: ["Lidiana", "Mariana"] },
  { principal: "Fátima", companions: ["Calbi"] },
  { principal: "Zé Maria", companions: [] },
  { principal: "Gorete", companions: ["Valdemir"] },
  { principal: "Antônio", companions: ["Suzi"] },
  { principal: "Vanda", companions: ["Marlene"] },
  { principal: "Apolinário", companions: ["Celia"] },
  { principal: "Iverleia", companions: ["Eldo", "Kauan", "Sofia", "Eloa"] },
  { principal: "Manoel", companions: ["Nilda"] },
  { principal: "Zé Pinel", companions: ["Iverlei"] },
  { principal: "Angelica", companions: ["Edivaldo"] },
  { principal: "Lúcia", companions: ["Irã"] },
  { principal: "Verônica", companions: ["Weslley", "Emanuel"] },
  { principal: "Francilene", companions: ["Raimunda"] },
  { principal: "Bianca", companions: ["Felipe", "Zaya"] },
  { principal: "Bebê", companions: [] },
  { principal: "Lya", companions: ["Thiago"] },
  { principal: "Ana Lúcia", companions: ["Lili", "Paulo Victor"] },
  { principal: "Das Dores", companions: ["Aguinaldo"] },
  { principal: "Priscila", companions: [] },
  { principal: "Erica", companions: ["Clara", "Junior"] },
  { principal: "Mikael", companions: ["Ianne"] },
  { principal: "Geliel", companions: [] },
  { principal: "Dulcenilda", companions: ["Yeska", "Gobério"] },
  { principal: "Paulo", companions: ["Mayara"] },
  { principal: "Lucas", companions: [] },
  { principal: "Wesley Dias", companions: ["Luana"] },
] as const;

async function main() {
  await prisma.setting.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, coupleName: "Kelvia & Erick" },
  });

  for (const guest of guestList) {
    const invite = await prisma.invite.findFirst({
      where: { label: guest.principal },
      include: { people: { select: { name: true } } },
    });

    if (!invite) {
      await prisma.invite.create({
        data: {
          label: guest.principal,
          people: {
            create: [guest.principal, ...guest.companions].map((name) => ({
              name,
              status: RSVPStatus.PENDING,
            })),
          },
        },
      });
      continue;
    }

    const existingNames = new Set(invite.people.map((person) => person.name));
    const missingNames = [guest.principal, ...guest.companions].filter(
      (name) => !existingNames.has(name),
    );
    if (missingNames.length > 0) {
      await prisma.person.createMany({
        data: missingNames.map((name) => ({
          name,
          inviteId: invite.id,
          status: RSVPStatus.PENDING,
        })),
      });
    }
  }

  if ((await prisma.gift.count()) === 0) {
    await prisma.gift.createMany({
      data: [
        {
          title: "Jogo de cama",
          description: "Para deixar nosso novo lar mais aconchegante.",
        },
        {
          title: "Kit de panelas",
          description: "Um presente para nossa nova fase.",
        },
        {
          title: "Cota para viagem",
          description: "Contribuição para a nossa lua de mel.",
        },
      ],
    });
  }

  const totalPeople = guestList.reduce(
    (total, guest) => total + 1 + guest.companions.length,
    0,
  );
  console.log(
    `Lista sincronizada: ${guestList.length} convites e ${totalPeople} pessoas.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error("Falha ao sincronizar a lista de convidados.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
